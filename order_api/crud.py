from sqlalchemy.orm import Session
from . import models, schemas

# Product CRUD
def get_products(db: Session):
    return db.query(models.Product).all()

def get_product(db: Session, product_id: int):
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def create_product(db: Session, product: schemas.ProductCreate):
    db_product = models.Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

# Customer CRUD
def get_customers(db: Session):
    return db.query(models.Customer).all()

def get_customer(db: Session, customer_id: int):
    return db.query(models.Customer).filter(models.Customer.id == customer_id).first()

def create_customer(db: Session, customer: schemas.CustomerCreate):
    db_customer = models.Customer(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

# Order CRUD
def get_orders(db: Session):
    orders = db.query(models.Order).all()
    # Add product details to all order items
    for order in orders:
        for item in order.order_items:
            item.product_label = item.product.label
            item.product_price = item.product.price
    return orders

def get_order(db: Session, order_id: int):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if order:
        # Add product details to order items
        for item in order.order_items:
            item.product_label = item.product.label
            item.product_price = item.product.price
    return order

def create_order(db: Session, order: schemas.OrderCreate):
    # Create order
    db_order = models.Order(
        customer_id=order.customer_id,
        source=order.source,
        destination=order.destination,
        priority=order.priority
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    # Add order items and calculate total
    total_amount = 0.0
    for item in order.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            order_item = models.OrderItem(
                order_id=db_order.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=product.price
            )
            db.add(order_item)
            total_amount += item.quantity * product.price
    
    # Update total amount
    db_order.total_amount = total_amount
    db.commit()
    db.refresh(db_order)
    
    # Add product details to order items for response
    for item in db_order.order_items:
        item.product_label = item.product.label
        item.product_price = item.product.price
    
    return db_order

def update_order_status(db: Session, order_id: int, status_update: schemas.OrderStatusUpdate):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if db_order:
        db_order.status = status_update.status
        db.commit()
        db.refresh(db_order)
    return db_order