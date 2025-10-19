"""
Transport Booking Agent - Fixed for Bedrock AgentCore
Books vehicles using internal Transport API based on load requirements
"""

from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent, tool
from strands.models.bedrock import BedrockModel
import os
import json
from typing import Dict, List, Any

# Environment variables
# Docker bridge network: use gateway IP to reach host
TRANSPORT_API_URL = os.getenv("TRANSPORT_API_URL", "http://localhost:3000/api/transport")
ORDER_API_URL = os.getenv("ORDER_API_URL", "http://localhost:8000/api/orders")

# Initialize BedrockAgentCoreApp
app = BedrockAgentCoreApp()


@tool
def check_vehicle_availability(
    date: str, min_weight_kg: float, min_volume_m3: float | None = None
) -> List[Dict[str, Any]]:
    """Check available vehicles from Transport API that meet capacity requirements."""
    import requests

    response = requests.get(
        f"{TRANSPORT_API_URL}/vehicles/available", params={"date": date}
    )
    response.raise_for_status()
    vehicles = response.json()

    suitable_vehicles = []
    for vehicle in vehicles:
        volume_m3 = (
            vehicle["length"] * vehicle["width"] * vehicle["height"]
        ) / 1_000_000_000

        if vehicle["weight"] >= min_weight_kg:
            if min_volume_m3 is None or volume_m3 >= min_volume_m3:
                suitable_vehicles.append(
                    {
                        "id": vehicle["id"],
                        "type": vehicle["type"],
                        "registration": vehicle["registrationNumber"],
                        "capacity": {
                            "weight_kg": vehicle["weight"],
                            "volume_m3": round(volume_m3, 2),
                            "dimensions_mm": {
                                "length": vehicle["length"],
                                "width": vehicle["width"],
                                "height": vehicle["height"],
                            },
                        },
                        "rate_per_km": vehicle["baseRatePerKm"],
                        "status": vehicle["status"],
                    }
                )

    suitable_vehicles.sort(key=lambda v: v["capacity"]["weight_kg"])
    return suitable_vehicles


@tool
def calculate_transport_cost(
    vehicle_id: str, pickup_address: str, delivery_address: str
) -> Dict[str, Any]:
    """Calculate transport cost using Transport API price calculator."""
    import requests

    response = requests.post(
        f"{TRANSPORT_API_URL}/bookings/calculate-price",
        json={
            "vehicleId": vehicle_id,
            "pickupAddress": pickup_address,
            "deliveryAddress": delivery_address,
        },
    )
    response.raise_for_status()
    return response.json()


@tool
def book_vehicle(
    order_id: int,
    customer_id: str,
    vehicle_id: str,
    pickup_address: str,
    delivery_address: str,
    pickup_datetime: str,
    cargo_details: Dict[str, Any],
    batch_id: str = "",
    order_ids: list[int] = [],
    s3_layout_key: str = "",
) -> Dict[str, Any]:
    """Book a vehicle through Transport API.

    Args:
        order_id: Primary order ID (for single order) or first order in batch
        customer_id: Transport API customer UUID (string)
        vehicle_id: Vehicle to book
        pickup_address: Pickup location
        delivery_address: Delivery location
        pickup_datetime: Pickup date and time
        cargo_details: Cargo specifications
        batch_id: Optional batch identifier for multi-order bookings
        order_ids: Optional list of all order IDs in batch
        s3_layout_key: S3 key for packing layout visualization (optional)
    """
    import requests

    # Build description based on single or batch booking
    if batch_id and order_ids:
        description = f"Batch {batch_id}: Orders {order_ids} - {cargo_details.get('description', 'Consolidated shipment')}"
    else:
        description = f"Order #{order_id}: {cargo_details.get('description', 'Logistics shipment')}"

    booking_data = {
        "customerId": customer_id,
        "vehicleId": vehicle_id,
        "pickupAddress": pickup_address,
        "deliveryAddress": delivery_address,
        "pickupDateTime": pickup_datetime,
        "cargoDetails": {
            "weight": cargo_details["weight_kg"],
            "dimensions": {
                "length": cargo_details["dimensions_mm"]["length"],
                "width": cargo_details["dimensions_mm"]["width"],
                "height": cargo_details["dimensions_mm"]["height"],
            },
            "description": description,
        },
    }

    if s3_layout_key:
        booking_data["s3LayoutKey"] = s3_layout_key

    response = requests.post(f"{TRANSPORT_API_URL}/bookings", json=booking_data)
    if response.status_code != 201:
        print(f"[ERROR] Booking failed: {response.status_code} - {response.text}")

    response.raise_for_status()
    booking = response.json()

    result = {
        "booking_id": booking["id"],
        "vehicle_id": booking["vehicleId"],
        "vehicle_type": booking.get("vehicle", {}).get("type", "Unknown"),
        "status": booking["status"],
        "pickup_datetime": booking["pickupDateTime"],
        "total_price": booking["totalPrice"],
        "distance_km": booking["distanceKm"],
        "created_at": booking["createdAt"],
        "s3_layout_key": booking.get("s3LayoutKey"),
    }

    # Add batch info if applicable
    if batch_id:
        result["batch_id"] = batch_id
        result["order_ids"] = order_ids

    return result


@tool
def update_booking_status(booking_id: str, status: str) -> Dict[str, Any]:
    """Update booking status in Transport API."""
    import requests

    response = requests.patch(
        f"{TRANSPORT_API_URL}/bookings/{booking_id}/status", json={"status": status}
    )
    response.raise_for_status()
    return response.json()


@tool
def get_booking_details(booking_id: str) -> Dict[str, Any]:
    """Fetch booking details from Transport API."""
    import requests

    response = requests.get(f"{TRANSPORT_API_URL}/bookings/{booking_id}")
    response.raise_for_status()
    return response.json()


# Create Transport Agent
model = BedrockModel(model_id="us.amazon.nova-premier-v1:0")

agent = Agent(
    model=model,
    tools=[
        check_vehicle_availability,
        calculate_transport_cost,
        book_vehicle,
        update_booking_status,
        get_booking_details,
    ],
    system_prompt="""
    You are a transport booking specialist using the internal Transport API. 
    Since this a demo environment, ignore unrealistic distance or cost values. 
    
    CRITICAL CUSTOMER ID RULE:
    - ALWAYS use the EXACT customer_id (UUID string) provided in the user prompt
    - The customer_id in the prompt is a Transport API UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    - NEVER modify, convert, or replace the customer_id
    - Look for phrases like Customer UUID (Transport API) or customer_id in the prompt
    - If you see customer_id with a UUID value, use EXACTLY that UUID
    
    S3 LAYOUT KEY RULE:
    - ALWAYS extract s3LayoutKey from the prompt if provided
    - Look for phrases like s3LayoutKey, s3_layout_key, or layout_key in the prompt
    - Pass the EXACT s3LayoutKey value to book_vehicle function
    - The s3LayoutKey is used for packing visualization in the UI
    
    Your workflow:
    SINGLE ORDER BOOKING:
    1. Extract customer_id UUID from prompt
    2. Extract s3_layout_key from prompt if provided
    3. Use check_vehicle_availability to find suitable vehicles
    4. Use calculate_transport_cost to get price quotes
    5. Select the most cost-effective vehicle that meets requirements
    6. Use book_vehicle with the EXACT customer_id and s3_layout_key from steps 1-2
    7. Confirm booking status
    
    BATCH BOOKING (MULTIPLE ORDERS):
    1. Extract customer_id UUID from prompt (CRITICAL: use exact value provided)
    2. Extract s3_layout_key from prompt if provided
    3. Use check_vehicle_availability with TOTAL weight and volume for all orders
    4. Use calculate_transport_cost for cost estimation
    5. Select vehicle that fits all orders together
    6. Use book_vehicle with batch_id, order_ids, s3_layout_key, and the EXACT customer_id UUID from steps 1-2
    7. The booking description will automatically include batch info
    
    Selection criteria (in priority order):
    1. Vehicle must meet capacity requirements (weight and volume)
    2. Vehicle must be available on required date
    3. Choose smallest suitable vehicle for cost efficiency
    4. Consider distance and total cost
    
    SINGLE ORDER RETURN FORMAT:
    - booking_id: string
    - vehicle_id: string
    - vehicle_type: string
    - status: string
    - total_cost: number
    - distance_km: number
    - pickup_datetime: string
    - s3_layout_key: string (optional)
    
    BATCH BOOKING RETURN FORMAT:
    - booking_id: string
    - batch_id: string
    - order_ids: list
    - vehicle_id: string
    - vehicle_type: string
    - status: string
    - total_cost: number
    - distance_km: number
    - pickup_datetime: string
    - s3_layout_key: string (optional)
    
    Handle errors gracefully:
    - If no vehicles available, suggest alternative dates
    - If capacity insufficient, recommend splitting shipment
    """,
)


@app.entrypoint
def invoke(payload):
    """Process transport booking requests and return JSON-serializable response."""
    user_message = payload.get("prompt", "")

    if not user_message:
        return {"error": "No prompt found in input. Please provide a 'prompt' key."}

    result = agent(user_message)

    # Return JSON-serializable response
    return {"message": result.message, "status": "success"}


if __name__ == "__main__":
    app.run()
