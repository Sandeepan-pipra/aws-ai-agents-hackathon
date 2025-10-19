"""
Orchestrator Agent - Fixed for Bedrock AgentCore
Coordinates between Analyser and Transport agents to process orders end-to-end
"""

from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent, tool
from strands.models.bedrock import BedrockModel
import os
import json
import re
import html
import boto3
from typing import Dict, Any
from datetime import datetime

# Environment variables
ORDER_API_URL = os.getenv("ORDER_API_URL", "http://localhost:8000/api/orders")
TRANSPORT_API_URL = os.getenv("TRANSPORT_API_URL", "http://localhost:3000/api/transport")
ANALYSER_AGENT_ARN = os.getenv(
    "ANALYSER_AGENT_ARN",
    "arn:aws:bedrock-agentcore:us-east-1:YOUR_ACCOUNT_ID:runtime/analyser_agent-xxx",
)
TRANSPORT_AGENT_ARN = os.getenv(
    "TRANSPORT_AGENT_ARN",
    "arn:aws:bedrock-agentcore:us-east-1:YOUR_ACCOUNT_ID:runtime/transport_agent-xxx",
)
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
SNS_TOPIC_ARN = os.getenv(
    "SNS_TOPIC_ARN", "arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:logistics-notifications"
)

# AWS clients
bedrock_agentcore = boto3.client("bedrock-agentcore", region_name=AWS_REGION)
sns_client = boto3.client("sns", region_name=AWS_REGION)

# Initialize BedrockAgentCoreApp
app = BedrockAgentCoreApp()


def extract_json_from_response(response_data: Any) -> Dict[str, Any]:
    """Robust JSON extraction with HTML unescaping and integer key handling."""
    # Strategy 1: Already valid dict
    if isinstance(response_data, dict) and "batch_id" in response_data:
        return response_data

    # Strategy 2: Extract from message.content[0].text
    text = None
    if isinstance(response_data, dict):
        if "message" in response_data:
            msg = response_data["message"]
            if isinstance(msg, dict) and "content" in msg:
                if isinstance(msg["content"], list) and len(msg["content"]) > 0:
                    text = msg["content"][0].get("text", "")

    # Strategy 3: Direct string
    if text is None and isinstance(response_data, str):
        text = response_data

    if text:
        # Remove thinking tags
        text = re.sub(r"<thinking>.*?</thinking>", "", text, flags=re.DOTALL)

        # Unescape HTML entities (&quot; -> ")
        text = html.unescape(text)

        # Find JSON object using balanced brace matching
        start_idx = text.find("{")
        if start_idx != -1:
            brace_count = 0
            for i, char in enumerate(text[start_idx:], start=start_idx):
                if char == "{":
                    brace_count += 1
                elif char == "}":
                    brace_count -= 1
                    if brace_count == 0:
                        json_str = text[start_idx : i + 1]
                        # Fix integer keys by converting to strings
                        json_str = re.sub(r"(\{|,)\s*(\d+):", r'\1"\2":', json_str)
                        return json.loads(json_str)

    raise ValueError(f"Could not extract JSON from response: {type(response_data)}")


@tool
def fetch_pending_orders(limit: int = 50) -> list[Dict[str, Any]]:
    """Fetch pending orders from Order API that need transport processing."""
    import requests

    response = requests.get(f"{ORDER_API_URL}/orders/")
    response.raise_for_status()
    orders = response.json()
    pending = [o for o in orders if o.get("status") == "pending"][:limit]
    return pending


@tool
def fetch_order_details(order_id: int) -> Dict[str, Any]:
    """Fetch complete order details including addresses and customer info."""
    import requests

    response = requests.get(f"{ORDER_API_URL}/orders/{order_id}")
    response.raise_for_status()
    return response.json()


@tool
def get_order_customer_id(order_id: int) -> int:
    """Fetch customer_id from an order."""
    import requests

    try:
        response = requests.get(f"{ORDER_API_URL}/orders/{order_id}")
        response.raise_for_status()
        return response.json()["customer_id"]
    except Exception as e:
        raise Exception(f"Failed to fetch customer_id for order {order_id}: {str(e)}")


@tool
def get_customer_from_order_api(customer_id: int) -> Dict[str, Any]:
    """Fetch customer details from Order API."""
    import requests

    response = requests.get(f"{ORDER_API_URL}/customers/{customer_id}")
    response.raise_for_status()
    return response.json()


@tool
def get_or_create_transport_customer(order_customer_id: int) -> str:
    """Get or create customer in Transport API, returns Transport customer UUID.

    Args:
        order_customer_id: Customer ID from Order API (integer)

    Returns:
        Transport API customer UUID (string)
    """
    import requests

    # Fetch customer from Order API
    order_customer = get_customer_from_order_api(order_customer_id)

    # Check if customer exists in Transport API by email
    transport_customers_response = requests.get(f"{TRANSPORT_API_URL}/customers")
    transport_customers_response.raise_for_status()
    transport_customers = transport_customers_response.json()

    # Find existing customer by email
    for customer in transport_customers:
        if customer["email"] == order_customer["email"]:
            return customer["id"]

    # Create new customer in Transport API
    new_customer_data = {
        "name": order_customer["name"],
        "email": order_customer["email"],
        "contactNumber": order_customer.get("phone", "+91-0000000000"),
        "address": f"{order_customer.get('city', 'Unknown')}, {order_customer.get('pin_code', '000000')}",
    }

    create_response = requests.post(
        f"{TRANSPORT_API_URL}/customers", json=new_customer_data
    )
    create_response.raise_for_status()
    new_customer = create_response.json()

    return new_customer["id"]


@tool
def group_orders_by_route(orders: list[Dict[str, Any]]) -> Dict[str, list]:
    """Group orders by (source_city, destination_city) route. Max 10 orders per group.

    Args:
        orders: List of order objects with source and destination string fields

    Returns:
        Dictionary mapping route keys to order lists
    """
    routes = {}

    for order in orders:
        # Get source and destination as strings
        source = order.get("source", "unknown")
        destination = order.get("destination", "unknown")

        # Extract city from comma-separated string
        # Format: "City, State" or "Address, City, State"
        source_parts = source.split(",")
        dest_parts = destination.split(",")

        # Take last 2 parts for "City, State" or second-to-last for full address
        if len(source_parts) >= 2:
            source_city = (
                source_parts[-2].strip()
                if len(source_parts) > 2
                else source_parts[0].strip()
            )
        else:
            source_city = source.strip()

        if len(dest_parts) >= 2:
            dest_city = (
                dest_parts[-2].strip() if len(dest_parts) > 2 else dest_parts[0].strip()
            )
        else:
            dest_city = destination.strip()

        # Create route key
        route_key = f"{source_city.lower().replace(' ', '-')}_{dest_city.lower().replace(' ', '-')}"

        if route_key not in routes:
            routes[route_key] = []

        routes[route_key].append(order)

    # Split groups exceeding 10 orders
    final_routes = {}
    for route_key, route_orders in routes.items():
        if len(route_orders) <= 10:
            final_routes[route_key] = route_orders
        else:
            # Split into batches of 10
            for i in range(0, len(route_orders), 10):
                batch_key = f"{route_key}_batch{i//10 + 1}"
                final_routes[batch_key] = route_orders[i : i + 10]

    return final_routes


@tool
def invoke_analyser_agent(order_id: int) -> Dict[str, Any]:
    """Invoke Analyser agent to analyze order and generate packing layout."""
    session_id = (
        f'order-{order_id}-{datetime.now().strftime("%Y%m%d%H%M%S")}-' + "0" * 32
    )
    session_id = session_id[:64]  # Ensure 64 chars

    payload = {
        "prompt": f"Analyze order {order_id} and determine if transport is needed. If yes, generate optimal packing layout."
    }

    response = bedrock_agentcore.invoke_agent_runtime(
        agentRuntimeArn=ANALYSER_AGENT_ARN,
        runtimeSessionId=session_id,
        payload=json.dumps(payload).encode("utf-8"),
    )

    response_body = response["response"].read().decode("utf-8")
    return json.loads(response_body)


@tool
def invoke_transport_agent(
    order_id: int, requirements: Dict[str, Any]
) -> Dict[str, Any]:
    """Invoke Transport agent to book vehicle based on requirements."""
    from datetime import timedelta

    session_id = (
        f'order-{order_id}-transport-{datetime.now().strftime("%Y%m%d%H%M%S")}-'
        + "0" * 32
    )
    session_id = session_id[:64]  # Ensure 64 chars

    # Use tomorrow's date if not provided
    pickup_date = requirements.get("pickup_date")
    if not pickup_date or pickup_date.startswith("2023"):
        pickup_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

    prompt = f"""
    Book transport for order {order_id} with the following requirements:
    - Weight: {requirements.get('total_weight_kg')} kg
    - Volume: {requirements.get('total_volume_m3')} m³
    - Pickup: {requirements.get('pickup_address')}
    - Delivery: {requirements.get('delivery_address')}
    - Date: {pickup_date}
    - Special requirements: {requirements.get('special_requirements', 'None')}
    
    Find the most cost-effective vehicle and create the booking.
    """

    payload = {"prompt": prompt}

    response = bedrock_agentcore.invoke_agent_runtime(
        agentRuntimeArn=TRANSPORT_AGENT_ARN,
        runtimeSessionId=session_id,
        payload=json.dumps(payload).encode("utf-8"),
    )

    response_body = response["response"].read().decode("utf-8")
    return json.loads(response_body)


@tool
def update_order_status(order_id: int, status: str) -> Dict[str, Any]:
    """Update order status in Order API.

    Valid status values: pending, shipped, delivered, cancelled
    """
    import requests

    valid_statuses = ["pending", "shipped", "delivered", "cancelled"]
    if status not in valid_statuses:
        return {"error": f"Invalid status '{status}'. Must be one of: {valid_statuses}"}

    response = requests.put(
        f"{ORDER_API_URL}/orders/{order_id}/status", json={"status": status}
    )
    response.raise_for_status()
    return response.json()


@tool
def update_orders_batch_status(
    order_ids: list[int], status: str, batch_id: str = ""
) -> list[Dict[str, Any]]:
    """Update status for multiple orders at once.

    Args:
        order_ids: List of order IDs to update
        status: New status (pending, shipped, delivered, cancelled)
        batch_id: Optional batch identifier for reference

    Returns:
        List of update results for each order
    """
    results = []
    for order_id in order_ids:
        try:
            result = update_order_status(order_id, status)
            result["order_id"] = order_id
            result["batch_id"] = batch_id
            results.append(result)
        except Exception as e:
            results.append(
                {
                    "order_id": order_id,
                    "batch_id": batch_id,
                    "error": str(e),
                    "status": "failed",
                }
            )
    return results


@tool
def send_notification(
    order_id: int, event_type: str, details: Dict[str, Any]
) -> Dict[str, Any]:
    """Send notification via SNS about order processing events."""
    try:
        topic_arn = SNS_TOPIC_ARN
        if not topic_arn:
            return {"status": "skipped", "reason": "SNS_TOPIC_ARN not configured"}

        message = {
            "order_id": order_id,
            "event_type": event_type,
            "timestamp": datetime.now().isoformat(),
            "details": details,
        }

        response = sns_client.publish(
            TopicArn=topic_arn,
            Subject=f"Logistics Order {order_id}: {event_type}",
            Message=json.dumps(message, indent=2),
        )

        return {"message_id": response["MessageId"], "status": "sent"}
    except Exception as e:
        # Log error but don't fail the workflow
        return {"status": "failed", "error": str(e)}


@tool
def send_batch_notification(
    batch_id: str, order_ids: list[int], event_type: str, details: Dict[str, Any]
) -> Dict[str, Any]:
    """Send notification via SNS about batch processing events.

    Args:
        batch_id: Batch identifier
        order_ids: List of order IDs in the batch
        event_type: Type of event (e.g., 'batch_shipped', 'batch_failed')
        details: Additional event details

    Returns:
        Notification result
    """
    try:
        topic_arn = SNS_TOPIC_ARN
        if not topic_arn:
            return {"status": "skipped", "reason": "SNS_TOPIC_ARN not configured"}

        message = {
            "batch_id": batch_id,
            "order_ids": order_ids,
            "event_type": event_type,
            "timestamp": datetime.now().isoformat(),
            "details": details,
        }

        response = sns_client.publish(
            TopicArn=topic_arn,
            Subject=f"Logistics Batch {batch_id}: {event_type}",
            Message=json.dumps(message, indent=2),
        )

        return {"message_id": response["MessageId"], "status": "sent"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


@tool
def process_batch_with_transport(batch_id: str, order_ids: list[int]) -> Dict[str, Any]:
    """Composite tool: Process batch end-to-end without LLM in data flow.

    This tool programmatically:
    1. Invokes analyser for batch packing
    2. Extracts ALL fields from analyser response
    3. Fetches customer_id from first order
    4. Fetches addresses from first order
    5. Builds complete requirements dict
    6. Invokes transport agent with all parameters
    7. Returns complete result

    Args:
        batch_id: Batch identifier
        order_ids: List of order IDs to process

    Returns:
        Complete batch processing result with all fields
    """
    try:
        # Step 1: Invoke analyser
        session_id = (
            f'batch-{batch_id}-{datetime.now().strftime("%Y%m%d%H%M%S")}-' + "0" * 32
        )
        session_id = session_id[:64]

        analyser_payload = {
            "prompt": f"Generate consolidated packing layout for batch {batch_id} containing orders {order_ids}. Use generate_batch_packing_layout tool with order_ids={order_ids} and batch_id='{batch_id}'. Return the complete tool output."
        }

        analyser_response = bedrock_agentcore.invoke_agent_runtime(
            agentRuntimeArn=ANALYSER_AGENT_ARN,
            runtimeSessionId=session_id,
            payload=json.dumps(analyser_payload).encode("utf-8"),
        )

        analyser_body = analyser_response["response"].read().decode("utf-8")
        analyser_result = json.loads(analyser_body)

        # Step 2: Extract JSON from response using robust parser
        try:
            analyser_data = extract_json_from_response(analyser_result)
        except Exception as e:
            return {
                "error": f"Failed to extract JSON from analyser response: {str(e)}",
                "raw_response": analyser_result,
            }

        # Step 3: Validate all required fields present
        required_fields = [
            "batch_id",
            "order_ids",
            "total_weight_kg",
            "total_volume_m3",
            "s3_key",
            "total_packages",
            "container_id",
        ]
        missing_fields = [f for f in required_fields if f not in analyser_data]
        if missing_fields:
            return {
                "error": f"Analyser response missing fields: {missing_fields}",
                "received_data": analyser_data,
            }

        # Extract s3LayoutKey for transport booking
        s3_layout_key = analyser_data.get("s3_key", "")

        # Step 4: Fetch customer_id from first order and map to Transport API
        import requests

        order_response = requests.get(f"{ORDER_API_URL}/orders/{order_ids[0]}")
        order_response.raise_for_status()
        order_data = order_response.json()
        order_customer_id = order_data["customer_id"]

        # Get or create customer in Transport API (returns UUID)
        transport_customer_uuid = get_or_create_transport_customer(order_customer_id)

        # Step 5: Build complete requirements
        from datetime import timedelta

        pickup_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

        requirements = {
            "customer_id": transport_customer_uuid,
            "total_weight_kg": analyser_data["total_weight_kg"],
            "total_volume_m3": analyser_data["total_volume_m3"],
            "container_id": analyser_data["container_id"],
            "pickup_address": order_data["source"],
            "delivery_address": order_data["destination"],
            "pickup_date": pickup_date,
            "s3_layout_key": s3_layout_key,
        }

        # Step 6: Invoke transport agent
        transport_session_id = (
            f'batch-{batch_id}-transport-{datetime.now().strftime("%Y%m%d%H%M%S")}-'
            + "0" * 32
        )
        transport_session_id = transport_session_id[:64]

        dimensions_mm = requirements["container_id"]

        transport_payload = {
            "prompt": f"""Book transport for BATCH {batch_id} containing orders {order_ids}.

            REQUIRED PARAMETERS:
            - Order ID: {order_ids[0]}
            - Customer UUID (Transport API): {transport_customer_uuid}
            - Weight: {requirements['total_weight_kg']} kg
            - Volume: {requirements['total_volume_m3']} m³
            - Dimensions: {dimensions_mm['length']}x{dimensions_mm['width']}x{dimensions_mm['height']} mm
            - Pickup: {requirements['pickup_address']}
            - Delivery: {requirements['delivery_address']}
            - Date: {pickup_date}T09:00:00
            - S3 Layout Key: {s3_layout_key}

            CRITICAL: Use book_vehicle() with customer_id="{transport_customer_uuid}" (this is the Transport API customer UUID, NOT the order customer ID).
            CRITICAL: Include s3_layout_key="{s3_layout_key}" in book_vehicle() call for 3D visualization.
            Call: book_vehicle(order_id={order_ids[0]}, customer_id="{transport_customer_uuid}", vehicle_id=<selected_vehicle>, pickup_address="{requirements['pickup_address']}", delivery_address="{requirements['delivery_address']}", pickup_datetime="{pickup_date}T09:00:00", cargo_details=<cargo>, batch_id="{batch_id}", order_ids={order_ids}, s3_layout_key="{s3_layout_key}")"""
        }

        transport_response = bedrock_agentcore.invoke_agent_runtime(
            agentRuntimeArn=TRANSPORT_AGENT_ARN,
            runtimeSessionId=transport_session_id,
            payload=json.dumps(transport_payload).encode("utf-8"),
        )

        transport_body = transport_response["response"].read().decode("utf-8")
        transport_result = json.loads(transport_body)

        # Step 7: Return complete result
        return {
            "status": "success",
            "batch_id": batch_id,
            "order_ids": order_ids,
            "analyser_result": analyser_data,
            "transport_result": transport_result,
            "requirements": requirements,
        }

    except Exception as e:
        print(f"[ERROR] process_batch_with_transport failed: {str(e)}")
        import traceback

        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return {
            "status": "failed",
            "error": str(e),
            "batch_id": batch_id,
            "order_ids": order_ids,
        }


# Create Orchestrator Agent
model = BedrockModel(
    model_id="us.amazon.nova-premier-v1:0",
)

agent = Agent(
    model=model,
    tools=[
        fetch_pending_orders,
        fetch_order_details,
        get_order_customer_id,
        get_customer_from_order_api,
        get_or_create_transport_customer,
        group_orders_by_route,
        invoke_analyser_agent,
        invoke_transport_agent,
        process_batch_with_transport,
        update_order_status,
        update_orders_batch_status,
        send_notification,
        send_batch_notification,
    ],
    system_prompt="""
    You are the logistics workflow orchestrator. You coordinate the entire order processing workflow.
    
    IMPORTANT: Order status can ONLY be: pending, shipped, delivered, cancelled
    
    WORKFLOW FOR SINGLE ORDER:
    1. Use fetch_order_details(order_id) to get order info (addresses, customer)
    2. Use invoke_analyser_agent(order_id) to analyze the order
    3. Check if transport is needed from analysis result
    4. If transport needed:
       a. Extract requirements from analysis (weight, volume)
       b. Extract logistics info from order (pickup=source, delivery=destination)
       c. Build requirements dict with: total_weight_kg, total_volume_m3, pickup_address, delivery_address
       d. Use invoke_transport_agent(order_id, requirements) to book vehicle (date will be auto-set to tomorrow)
       e. Use update_order_status(order_id, 'shipped')
       f. Use send_notification(order_id, 'transport_booked', details)
    5. If transport not needed:
       a. Use update_order_status(order_id, 'delivered')
       b. Use send_notification(order_id, 'no_transport_needed', details)
    
    WORKFLOW FOR BATCH PROCESSING (MULTIPLE ORDERS):
    1. Use fetch_pending_orders(limit) to get pending orders
    2. Use group_orders_by_route(orders) to group by (source_warehouse, destination_city)
       - This automatically splits groups exceeding 10 orders
    3. IMPORTANT: Select ONLY the batch with the MOST orders (largest batch)
       - Find the route group with highest order count
       - Process ONLY that batch
       - Report other batches as unprocessed
    4. For the selected largest batch:
       a. Generate batch_id: "batch-{timestamp}-{route_key}"
       b. Extract order_ids from group: [order['id'] for order in group]
       c. Use process_batch_with_transport(batch_id, order_ids)
          - This composite tool handles entire workflow programmatically
          - Eliminates LLM from data flow (prevents field truncation)
          - Automatically: invokes analyser, extracts all fields, fetches customer_id, builds requirements, invokes transport
          - Returns complete result with all data
       d. Use update_orders_batch_status(order_ids, 'shipped', batch_id)
       e. Use send_batch_notification(batch_id, order_ids, 'batch_shipped', details)
    5. Return summary with processed batch and unprocessed batches info
    
    ERROR HANDLING:
    - If process_batch_with_transport fails, check error details in response
    - If analyser fails for batch, mark all orders in batch as 'pending'
    - If transport booking fails for batch, mark all orders as 'pending'
    - Always send notifications for failures
    - Never stop processing other batches due to one failure
    
    SINGLE ORDER RETURN FORMAT:
    {
        "order_id": number,
        "status": "success" | "failed",
        "analysis": {analysis results},
        "booking": {booking results if applicable},
        "errors": [list of errors if any]
    }
    
    BATCH PROCESSING RETURN FORMAT:
    {
        "processed_batch": {
            "batch_id": string,
            "route": string,
            "order_ids": [list],
            "order_count": number,
            "status": "success" | "failed",
            "booking_id": number (if success),
            "total_weight_kg": number,
            "total_volume_m3": number,
            "s3_key": string,
            "container_id": object,
            "errors": [list if any]
        },
        "unprocessed_batches": [
            {
                "route": string,
                "order_count": number,
                "order_ids": [list]
            }
        ],
        "summary": {
            "total_orders": number,
            "processed_orders": number,
            "pending_orders": number
        }
    }
    
    COMPOSITE TOOL BENEFITS:
    - process_batch_with_transport() eliminates LLM from critical data pipeline
    - Guarantees all 8 fields from analyser are preserved and passed to transport
    - Prevents response truncation issues
    - Ensures customer_id is always fetched and included
    - More reliable and faster than multi-step LLM workflow
    """,
)


@app.entrypoint
def invoke(payload):
    """Process orchestration requests and return JSON-serializable response."""
    user_message = payload.get("prompt", "")

    if not user_message:
        return {"error": "No prompt found in input. Please provide a 'prompt' key."}

    result = agent(user_message)

    return {"message": result.message, "status": "success"}


if __name__ == "__main__":
    app.run()
