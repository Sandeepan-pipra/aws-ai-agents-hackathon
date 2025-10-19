"""Seed database with sample data"""

import sys
from pathlib import Path
from dotenv import load_dotenv
import os

# Load environment variables from .env file
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

print(f"Using database: {os.getenv('DATABASE_URL', 'sqlite:///./database.db')}")

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from order_api.database import SessionLocal, engine, Base
from order_api.models import Customer, Product, Order, OrderItem, OrderStatus
from datetime import datetime

# Create tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Clear existing data
db.query(OrderItem).delete()
db.query(Order).delete()
db.query(Product).delete()
db.query(Customer).delete()
db.commit()

# Add customers
customers = [
    Customer(
        name="John Doe", email="john@example.com", city="New York", pin_code="10001"
    ),
    Customer(
        name="Jane Smith",
        email="jane@example.com",
        city="Los Angeles",
        pin_code="90001",
    ),
]
db.add_all(customers)
db.commit()

# Add products
product1 = Product(
    label="Box A",
    length=200,
    width=150,
    height=100,
    weight=2.5,
    fragility=False,
    requires_refrigeration=False,
    price=10.0,
)
product2 = Product(
    label="Glassware",
    length=100,
    width=80,
    height=150,
    weight=1.2,
    fragility=True,
    requires_refrigeration=False,
    price=25.0,
)

products = [
    product1,
    product2,
    Product(
        label="Sack C",
        length=400,
        width=300,
        height=100,
        weight=5.0,
        fragility=False,
        requires_refrigeration=False,
        price=15.0,
    ),
    Product(
        label="Frozen Food",
        length=300,
        width=200,
        height=150,
        weight=3.0,
        fragility=False,
        requires_refrigeration=True,
        price=30.0,
    ),
]
db.add_all(products)
db.commit()
customer_id = db.query(Customer).first().id
# Add orders
order1 = Order(
    customer_id=customer_id,
    source="Warehouse A, 123 Main St, New York",
    destination="Store B, 456 Oak Ave, Brooklyn",
    status=OrderStatus.pending,
    priority=1,
    total_amount=0,
)
db.add(order1)
db.commit()

# Add order items
order_items = [
    OrderItem(order_id=order1.id, product_id=product1.id, quantity=10, unit_price=10.0),
    OrderItem(order_id=order1.id, product_id=product2.id, quantity=5, unit_price=25.0),
]
db.add_all(order_items)
db.commit()

# Update order total
order1.total_amount = sum(item.quantity * item.unit_price for item in order_items)
db.commit()

print("✅ Database seeded successfully!")
print(f"   - {len(customers)} customers")
print(f"   - {len(products)} products")
print(f"   - 1 order with {len(order_items)} items")

db.close()
