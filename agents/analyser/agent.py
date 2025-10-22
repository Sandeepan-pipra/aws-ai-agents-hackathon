"""
Analyser Agent - Fixed for Bedrock AgentCore
Analyzes orders and generates optimal 3D packing layouts
"""

from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent, tool
from strands.models.bedrock import BedrockModel
import os
import json
import boto3
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

# AWS clients
s3_client = boto3.client("s3")

# Environment variables
ORDER_API_URL = os.getenv("ORDER_API_URL", "http://localhost:8000/api/orders")
TRANSPORT_API_URL = os.getenv(
    "TRANSPORT_API_URL", "http://localhost:3000/api/transport"
)
S3_BUCKET = os.getenv("S3_LAYOUTS_BUCKET", "logistics-packing-layouts")

# Initialize BedrockAgentCoreApp
app = BedrockAgentCoreApp()


# ==================== PACKING ALGORITHM ====================


@dataclass
class PackingItem:
    name: str
    length_mm: float
    width_mm: float
    height_mm: float
    weight_kg: float
    fragile: bool = False

    def volume(self) -> float:
        return self.length_mm * self.width_mm * self.height_mm


@dataclass
class PackingContainer:
    id: str
    length_mm: float
    width_mm: float
    height_mm: float
    max_weight_kg: float


def calculate_support_height(x, y, width, length, placements):
    """Calculate height at which item should be placed based on items below.
    Requires minimal support (at least 80% overlap) to prevent floating."""
    max_height = 0.0

    for p in placements:
        px, py, pz = p["position_mm"]
        pl, pw, ph = p["dimensions_mm"]

        # Calculate overlap in X-Z plane (length-width)
        overlap_x_start = max(x, px)
        overlap_x_end = min(x + length, px + pl)
        overlap_z_start = max(y, py)  # y is width in our coordinate system
        overlap_z_end = min(y + width, py + pw)

        # Check if there's any overlap in the horizontal plane
        if overlap_x_start < overlap_x_end and overlap_z_start < overlap_z_end:
            overlap_area = (overlap_x_end - overlap_x_start) * (
                overlap_z_end - overlap_z_start
            )
            item_area = length * width
            support_ratio = overlap_area / item_area

            # Require at least 80% support - prevents floating while allowing some flexibility
            if support_ratio >= 0.80:
                max_height = max(max_height, pz + ph)

    return max_height


def check_collision(x, y, z, length, width, height, all_placements):
    """Check if item would collide with existing items."""
    for p in all_placements:
        px, py, pz = p["position_mm"]
        pl, pw, ph = p["dimensions_mm"]

        # Check overlap in all 3 dimensions
        overlap_x = not (x >= px + pl or x + length <= px)
        overlap_y = not (y >= py + pw or y + width <= py)
        overlap_z = not (z >= pz + ph or z + height <= pz)

        if overlap_x and overlap_y and overlap_z:
            return True
    return False


def find_best_position(
    item, container, all_placements, start_z, max_height, prefer_front
):
    """Find the best position: only stack with proper support, otherwise use floor."""
    candidates = []

    # Try positions in a grid pattern
    step_x = min(200, item.length_mm)
    step_y = min(200, item.width_mm)

    for x in range(0, int(container.length_mm - item.length_mm + 1), int(step_x)):
        for y in range(0, int(container.width_mm - item.width_mm + 1), int(step_y)):
            # Calculate support height at this position
            support_z = calculate_support_height(
                x, y, item.width_mm, item.length_mm, all_placements
            )

            # Only use support height if it's actually supported, otherwise use floor
            if support_z > 0.0:
                final_z = support_z  # Has proper support
                is_stacked = True
            else:
                final_z = 0.0  # No support, go to floor
                is_stacked = False

            # Check height constraint
            if final_z + item.height_mm > max_height:
                continue

            # Check for collisions
            if check_collision(
                x,
                y,
                final_z,
                item.length_mm,
                item.width_mm,
                item.height_mm,
                all_placements,
            ):
                continue

            # Scoring: prefer stacking with proper support
            stacking_bonus = 100 if is_stacked else 0

            # Apply fragile preference
            fragile_penalty = 0
            if prefer_front and x > container.length_mm * 0.6:
                fragile_penalty = 50

            # Final score: higher is better
            score = stacking_bonus - fragile_penalty - final_z * 0.001

            candidates.append((score, x, y, final_z))

    # Return best candidate (highest score)
    if candidates:
        candidates.sort(reverse=True)
        _, x, y, z = candidates[0]
        return (x, y, z)

    return None


def shelf_pack(
    items,
    container,
    start_z=0.0,
    start_order=1,
    max_height=None,
    prefer_front=False,
    existing_placements=None,
):
    """3D packing that prioritizes stacking over floor coverage."""
    placements = []
    leftover = []
    order = start_order
    max_height = max_height or container.height_mm
    all_placements = list(existing_placements or [])

    for item in items:
        # Find best position for this item
        pos = find_best_position(
            item, container, all_placements, start_z, max_height, prefer_front
        )

        if pos is None:
            leftover.append(item)
            continue

        x, y, z = pos

        # Place item
        placement = {
            "item_name": item.name,
            "dimensions_mm": [item.length_mm, item.width_mm, item.height_mm],
            "position_mm": [x, y, z],
            "placement_order": order,
            "fragile": item.fragile,
        }
        placements.append(placement)
        all_placements.append(placement)
        order += 1

    # Calculate actual used height
    used_height = start_z
    if placements:
        used_height = max(
            p["position_mm"][2] + p["dimensions_mm"][2] for p in placements
        )

    return placements, used_height, leftover


def pack_items_in_container(container, items):
    """Pack items into a single container with gravity support."""
    fragile = [i for i in items if i.fragile]
    non_fragile = [i for i in items if not i.fragile]

    non_fragile.sort(key=lambda i: i.weight_kg, reverse=True)
    fragile.sort(key=lambda i: i.weight_kg, reverse=True)

    placements = []
    leftover_total = []
    placement_order = 1

    heavy, medium = [], []
    if non_fragile:
        weights = [i.weight_kg for i in non_fragile]
        median_weight = sorted(weights)[len(weights) // 2]
        heavy = [i for i in non_fragile if i.weight_kg >= median_weight]
        medium = [i for i in non_fragile if i.weight_kg < median_weight]

    used_height = 0.0

    # Pack heavy items at bottom
    if heavy:
        heavy_res, used_height, leftover_h = shelf_pack(
            heavy, container, used_height, placement_order, None, False, placements
        )
        placements.extend(heavy_res)
        leftover_total.extend(leftover_h)
        placement_order += len(heavy_res)

    # Pack medium items on top of heavy items
    if medium:
        mid_res, used_height, leftover_m = shelf_pack(
            medium, container, used_height, placement_order, None, False, placements
        )
        placements.extend(mid_res)
        leftover_total.extend(leftover_m)
        placement_order += len(mid_res)

    # Pack fragile items on top (door preference relaxed for space efficiency)
    if fragile:
        f_res, _, leftover_f = shelf_pack(
            fragile, container, used_height, placement_order, None, True, placements
        )
        placements.extend(f_res)
        leftover_total.extend(leftover_f)

        # If fragile items couldn't fit due to door preference, try again without preference
        if leftover_f:
            f_res2, _, leftover_f2 = shelf_pack(
                leftover_f,
                container,
                used_height,
                placement_order + len(f_res),
                None,
                False,
                placements + f_res,
            )
            placements.extend(f_res2)
            leftover_total = [item for item in leftover_total if item not in f_res2]
            leftover_total.extend(leftover_f2)

    return placements, leftover_total


def validate_packing(placements: List[Dict], container) -> List[str]:
    """Validate packing for overlaps and bounds violations."""
    errors = []

    for i, p1 in enumerate(placements):
        # Check bounds
        x1, y1, z1 = p1["position_mm"]
        l1, w1, h1 = p1["dimensions_mm"]

        if x1 < 0 or y1 < 0 or z1 < 0:
            errors.append(
                f"Item {p1['item_name']} has negative position: ({x1}, {y1}, {z1})"
            )

        if x1 + l1 > container.length_mm:
            errors.append(f"Item {p1['item_name']} exceeds container length")
        if y1 + w1 > container.width_mm:
            errors.append(f"Item {p1['item_name']} exceeds container width")
        if z1 + h1 > container.height_mm:
            errors.append(f"Item {p1['item_name']} exceeds container height")

        # Check overlaps with other items
        for j, p2 in enumerate(placements[i + 1 :], start=i + 1):
            x2, y2, z2 = p2["position_mm"]
            l2, w2, h2 = p2["dimensions_mm"]

            # Check if boxes overlap in all 3 dimensions
            overlap_x = not (x1 + l1 <= x2 or x2 + l2 <= x1)
            overlap_y = not (y1 + w1 <= y2 or y2 + w2 <= y1)
            overlap_z = not (z1 + h1 <= z2 or z2 + h2 <= z1)

            if overlap_x and overlap_y and overlap_z:
                errors.append(
                    f"Overlap detected: {p1['item_name']} at ({x1},{y1},{z1}) and {p2['item_name']} at ({x2},{y2},{z2})"
                )

    return errors


def choose_containers_and_pack(commodities, containers):
    """Tries to fit items into as few containers as possible."""
    items = []
    for c in commodities:
        for _ in range(int(c.get("quantity", 1))):
            items.append(
                PackingItem(
                    name=c["name"],
                    length_mm=c["length_mm"],
                    width_mm=c["width_mm"],
                    height_mm=c["height_mm"],
                    weight_kg=c["weight_kg"],
                    fragile=bool(c.get("fragile", False)),
                )
            )

    container_objs = sorted(
        [PackingContainer(**ct) for ct in containers],
        key=lambda c: c.length_mm * c.width_mm * c.height_mm,
    )

    total_volume = sum(i.volume() for i in items)
    total_weight = sum(i.weight_kg for i in items)

    results = {
        "containers": [],
        "summary": {"total_items": len(items), "total_weight_kg": total_weight},
    }

    current_items = items
    container_index = 0
    while current_items and container_index < len(container_objs):
        container = container_objs[container_index]
        placements, leftover = pack_items_in_container(container, current_items)

        # Validate packing
        validation_errors = validate_packing(placements, container)
        if validation_errors:
            results["validation_warnings"] = validation_errors

        results["containers"].append(
            {
                "id": container.id,
                "dimensions_mm": {
                    "length": container.length_mm,
                    "width": container.width_mm,
                    "height": container.height_mm,
                },
                "max_weight_kg": container.max_weight_kg,
                "placements": placements,
            }
        )

        current_items = leftover
        container_index += 1

    if current_items:
        results["unplaced_items"] = [i.name for i in current_items]
        results["summary"][
            "note"
        ] = "Some items could not be placed due to space or weight limits."
    else:
        results["summary"]["note"] = "All items successfully packed across containers."

    results["summary"]["total_containers_used"] = len(results["containers"])

    return results


# ==================== HELPER FUNCTIONS ====================


def fetch_available_vehicles() -> List[Dict]:
    """Fetch vehicle list from transport API."""
    import requests

    vehicles_url = f"{TRANSPORT_API_URL}/vehicles"
    response = requests.get(vehicles_url)
    vehicles = response.json()
    return [
        {
            "id": v["id"],
            "length_mm": v["length"],
            "width_mm": v["width"],
            "height_mm": v["height"],
            "max_weight_kg": v["weight"],
        }
        for v in vehicles
    ]


def prepare_commodities(products: List[Dict]) -> Tuple[List[Dict], Dict[str, float]]:
    """Convert products to commodities format and build weight map."""
    commodities = []
    weight_map = {}
    for item in products:
        product = item["product"]
        weight_map[product["label"]] = product["weight"]
        commodities.append(
            {
                "name": product["label"],
                "length_mm": product["length"],
                "width_mm": product["width"],
                "height_mm": product["height"],
                "weight_kg": product["weight"],
                "quantity": item["quantity"],
                "fragile": product.get("fragility", False),
            }
        )
    return commodities, weight_map


def prepare_commodities_batch(
    products: List[Dict],
) -> Tuple[List[Dict], Dict[str, float], Dict[str, int]]:
    """Convert products from multiple orders to commodities format with unique names.

    Args:
        products: List with structure [{"order_id": int, "quantity": int, "product": {...}}]

    Returns:
        (commodities_list, weight_map, item_order_map)
    """
    commodities = []
    weight_map = {}
    item_order_map = {}  # Maps item_name to order_id
    global_counter = 0  # Global counter for all items

    for item in products:
        product = item["product"]
        order_id = item["order_id"]
        quantity = item["quantity"]
        base_name = product["label"]

        # Create separate commodity for each instance
        for i in range(quantity):
            global_counter += 1
            unique_name = f"{base_name}-order{order_id}-item{global_counter}"

            weight_map[unique_name] = product["weight"]
            item_order_map[unique_name] = order_id

            commodities.append(
                {
                    "name": unique_name,
                    "length_mm": product["length"],
                    "width_mm": product["width"],
                    "height_mm": product["height"],
                    "weight_kg": product["weight"],
                    "quantity": 1,  # Each commodity is a single item
                    "fragile": product.get("fragility", False),
                }
            )

    return commodities, weight_map, item_order_map


def save_layout_to_s3(
    identifier: str, layout: Dict[str, Any], is_batch: bool = False
) -> str:
    """Save layout JSON to S3 and return S3 key.

    Args:
        identifier: order_id (int) or batch_id (str)
        layout: Layout data to save
        is_batch: True if saving batch layout, False for single order
    """
    from datetime import datetime

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    if is_batch:
        s3_key = f"layouts/{identifier}-{timestamp}.json"
    else:
        s3_key = f"layouts/order-{identifier}-{timestamp}.json"

    layout_json = json.dumps(layout, indent=2)

    s3_client.put_object(
        Bucket=S3_BUCKET,
        Key=s3_key,
        Body=layout_json,
        ContentType="application/json",
    )
    return s3_key


# ==================== TOOLS ====================


@tool
def fetch_order_details(order_id: int) -> Dict[str, Any]:
    """Fetch order details from Order API including products and customer info."""
    import requests

    order_url = f"{ORDER_API_URL}/orders/{order_id}"
    response = requests.get(order_url)
    response.raise_for_status()
    order = response.json()

    customer_url = f"{ORDER_API_URL}/customers/{order['customer_id']}"
    customer_response = requests.get(customer_url)
    customer = customer_response.json()

    # Fetch all products to enrich order items
    products_url = f"{ORDER_API_URL}/products/"
    products_response = requests.get(products_url)
    products_response.raise_for_status()
    all_products = products_response.json()
    products_map = {p["id"]: p for p in all_products}

    # Transform order_items to include full product details
    enriched_products = [
        {"quantity": item["quantity"], "product": products_map[item["product_id"]]}
        for item in order["order_items"]
    ]

    return {
        "order_id": order["id"],
        "customer": customer,
        "source": order["source"],
        "destination": order["destination"],
        "priority": order["priority"],
        "status": order["status"],
        "products": enriched_products,
    }


@tool
def fetch_multiple_order_details(order_ids: list[int]) -> Dict[str, Any]:
    """Fetch details for multiple orders and aggregate products with order_id tags.

    Returns:
        Combined order data with products tagged by order_id for batch processing.
    """
    import requests

    # Fetch all products once
    products_url = f"{ORDER_API_URL}/products/"
    products_response = requests.get(products_url)
    products_response.raise_for_status()
    all_products = products_response.json()
    products_map = {p["id"]: p for p in all_products}

    orders_data = []
    all_products_tagged = []
    source = None
    destination = None

    for order_id in order_ids:
        order_url = f"{ORDER_API_URL}/orders/{order_id}"
        response = requests.get(order_url)
        response.raise_for_status()
        order = response.json()

        # Validate same source and destination
        if source is None:
            source = order["source"]
            destination = order["destination"]

        # Tag products with order_id
        for item in order["order_items"]:
            all_products_tagged.append(
                {
                    "order_id": order_id,
                    "quantity": item["quantity"],
                    "product": products_map[item["product_id"]],
                }
            )

        orders_data.append(order)

    return {
        "order_ids": order_ids,
        "source": source,
        "destination": destination,
        "products": all_products_tagged,
        "total_orders": len(order_ids),
    }


@tool
def calculate_load_requirements(products: List[Dict]) -> Dict[str, Any]:
    """Calculate total weight, volume, and special requirements from products.

    Args:
        products: List of product items with structure:
            [{"quantity": int, "product": {"weight": float, "length": int, "width": int,
              "height": int, "fragility": bool, "requires_refrigeration": bool}}]
            Use the exact structure returned by fetch_order_details.
    """
    total_weight = 0.0
    total_volume = 0.0
    is_fragile = False
    needs_refrigeration = False

    for item in products:
        product = item["product"]
        quantity = item["quantity"]

        weight = product.get("weight", 0) * quantity
        volume = (
            product.get("length", 0)
            * product.get("width", 0)
            * product.get("height", 0)
            * quantity
        ) / 1_000_000_000

        total_weight += weight
        total_volume += volume

        if product.get("fragility", False):
            is_fragile = True
        if product.get("requires_refrigeration", False):
            needs_refrigeration = True

    needs_transport = total_weight > 10 or total_volume > 0.1

    return {
        "total_weight_kg": round(total_weight, 2),
        "total_volume_m3": round(total_volume, 3),
        "is_fragile_item": is_fragile,
        "needs_refrigeration": needs_refrigeration,
        "needs_transport": needs_transport,
        "recommended_vehicle_capacity": {
            "min_weight_kg": total_weight * 1.2,
            "min_volume_m3": total_volume * 1.2,
        },
    }


@tool
def generate_packing_layout(
    order_id: int,
    products: List[Dict],
    available_containers: Optional[List[Dict]] = None,
) -> Dict[str, Any]:
    """Generate optimal 3D packing layout and save to S3.

    Args:
        order_id: Order ID for S3 key generation
        products: List of product items with structure:
            [{"quantity": int, "product": {"label": str, "weight": float, "length": int,
              "width": int, "height": int, "fragility": bool}}]
            Use the exact structure returned by fetch_order_details.
        available_containers: Optional list of containers (fetched automatically if not provided)

    Returns:
        Summary with S3 key and package count (NOT the full layout to avoid truncation).
    """
    # 1. Get containers
    containers = available_containers or fetch_available_vehicles()

    # 2. Prepare data
    commodities, weight_map = prepare_commodities(products)

    # 3. Run packing algorithm
    algorithm_output = choose_containers_and_pack(commodities, containers)

    # 4. Transform to UI format
    ui_layout = transform_to_ui_format(algorithm_output, weight_map)

    # 5. Save to S3
    s3_key = save_layout_to_s3(str(order_id), ui_layout, is_batch=False)

    # 6. Return summary
    return {
        "s3_key": s3_key,
        "total_packages": len(ui_layout["packages"]),
        "containers_used": 1,
        "container_id": ui_layout["container"]["size"],
    }


@tool
def generate_batch_packing_layout(
    order_ids: list[int],
    batch_id: str,
    available_containers: Optional[List[Dict]] = None,
) -> Dict[str, Any]:
    """Generate consolidated packing layout for multiple orders.

    Args:
        order_ids: List of order IDs to pack together
        batch_id: Batch identifier for S3 key generation
        available_containers: Optional list of containers

    Returns:
        Summary with batch info, S3 key, and order-item mapping.
    """
    # 1. Fetch all order details
    batch_data = fetch_multiple_order_details(order_ids)

    # 2. Get containers
    containers = available_containers or fetch_available_vehicles()

    # 3. Prepare batch commodities with order_id tagging
    commodities, weight_map, item_order_map = prepare_commodities_batch(
        batch_data["products"]
    )

    # 4. Run packing algorithm
    algorithm_output = choose_containers_and_pack(commodities, containers)

    # 5. Transform to UI format with order_id tags
    ui_layout = transform_to_ui_format(algorithm_output, weight_map, item_order_map)

    # Add batch metadata to layout
    ui_layout["batch_id"] = batch_id
    ui_layout["order_ids"] = order_ids

    # 6. Save to S3
    s3_key = save_layout_to_s3(batch_id, ui_layout, is_batch=True)

    # 7. Calculate totals
    total_weight = sum(weight_map.values())
    total_volume = (
        sum(
            pkg["size"]["length"] * pkg["size"]["width"] * pkg["size"]["height"]
            for pkg in ui_layout["packages"]
        )
        / 1_000_000_000
    )

    # 8. Build order-item mapping (count only, not full list)
    order_item_mapping = {}
    for pkg in ui_layout["packages"]:
        if "order_id" in pkg:
            oid = str(pkg["order_id"])
            if oid not in order_item_mapping:
                order_item_mapping[oid] = {"item_count": 0, "sample_items": []}
            order_item_mapping[oid]["item_count"] += 1
            if len(order_item_mapping[oid]["sample_items"]) < 3:
                order_item_mapping[oid]["sample_items"].append(pkg["id"])

    return {
        "batch_id": batch_id,
        "order_ids": order_ids,
        "total_weight_kg": round(total_weight, 2),
        "total_volume_m3": round(total_volume, 3),
        "s3_key": s3_key,
        "total_packages": len(ui_layout["packages"]),
        "container_id": ui_layout["container"]["size"],
        "order_item_mapping": order_item_mapping,
    }


def transform_to_ui_format(
    algorithm_output: Dict[str, Any],
    weight_map: Dict[str, float],
    item_order_map: Optional[Dict[str, int]] = None,
) -> Dict[str, Any]:
    """Transform algorithm output to UI-compatible format.

    Args:
        algorithm_output: Output from packing algorithm
        weight_map: Maps item names to weights
        item_order_map: Optional map of item names to order_ids (for batch processing)
    """
    container = algorithm_output["containers"][0]
    container_length = container["dimensions_mm"]["length"]
    container_width = container["dimensions_mm"]["width"]
    container_height = container["dimensions_mm"]["height"]

    # Container offsets for centering in UI
    offset_x = -container_length / 2
    offset_z = -container_width / 2
    container_center_y = container_height / 2

    ui_output = {
        "container": {
            "size": {
                "length": container_length,
                "height": container_height,
                "width": container_width,
            },
            "position": {"x": 0, "y": container_center_y, "z": 0},
            "maxWeight": container["max_weight_kg"],
            "color": "#95a5a6",
        },
        "packages": [],
    }

    colors = ["#c0392b", "#2980b9", "#27ae60", "#d68910", "#8e44ad", "#16a085"]
    color_map = {}
    item_counter = {}
    color_idx = 0

    for placement in container["placements"]:
        name = placement["item_name"]
        item_counter[name] = item_counter.get(name, 0) + 1

        # Assign consistent color per product name
        if name not in color_map:
            color_map[name] = colors[color_idx % len(colors)]
            color_idx += 1

        package = {
            "id": f"{name.lower().replace(' ', '-')}-{item_counter[name]}",
            "position": {
                "x": placement["position_mm"][0] + offset_x,
                "y": placement["position_mm"][2],
                "z": placement["position_mm"][1] + offset_z,
            },
            "size": {
                "length": placement["dimensions_mm"][0],
                "height": placement["dimensions_mm"][2],
                "width": placement["dimensions_mm"][1],
            },
            "weight": weight_map.get(name, 0),
            "color": color_map[name],
            "label": name,
            "placementOrder": placement.get("placement_order", item_counter[name]),
            "fragile": placement.get("fragile", False),
        }

        # Add order_id if batch processing
        if item_order_map and name in item_order_map:
            package["order_id"] = item_order_map[name]

        ui_output["packages"].append(package)

    return ui_output


# Create Analyser Agent
model = BedrockModel(
    model_id="us.amazon.nova-premier-v1:0",
)

agent = Agent(
    name="LogisticsLoadAnalyser",
    model=model,
    tools=[
        fetch_order_details,
        fetch_multiple_order_details,
        calculate_load_requirements,
        generate_packing_layout,
        generate_batch_packing_layout,
    ],
    system_prompt="""You are a logistics load planning expert.

BATCH WORKFLOW:
1. Use generate_batch_packing_layout(order_ids, batch_id) for multiple orders
   - Fetches order details automatically
   - Packs items from all orders together
   - Tags items with order_id for traceability
   - Generates consolidated layout
   - Saves to S3 with batch_id

2. CRITICAL: Return EXACT output with ALL 8 fields:
   - batch_id (string)
   - order_ids (array)
   - total_weight_kg (number)
   - total_volume_m3 (number)
   - s3_key (string)
   - total_packages (number)
   - container_id (object)
   - order_item_mapping (object with item_count and sample_items)
   - DO NOT extract only weight/volume
   - DO NOT add explanatory text
   - DO NOT summarize

Constraints:
- Fragile items on top, near door
- Heavy items at bottom
- Refrigerated items together
- Efficient space utilization
- Max 10 orders per batch

RETURN FORMAT (ALL 8 FIELDS):
{"batch_id": str, "order_ids": [], "total_weight_kg": num, "total_volume_m3": num, "s3_key": str, "total_packages": num, "container_id": {length, width, height}, "order_item_mapping": {order_id: {item_count, sample_items}}}""",
)


@app.entrypoint
def invoke(payload):
    """Process order analysis requests and return JSON-serializable response."""
    user_message = payload.get("prompt", "")

    if not user_message:
        return {"error": "No prompt found in input. Please provide a 'prompt' key."}

    result = agent(user_message)

    return {"message": result.message, "status": "success"}


if __name__ == "__main__":
    app.run()
