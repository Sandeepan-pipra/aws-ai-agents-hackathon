from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

# Use absolute import for standalone scripts
from .database import Base

class OrderStatus(enum.Enum):
    pending = "pending"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"

class Customer(Base):
    __tablename__ = "customer"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    city = Column(String)
    pin_code = Column(String)
    
    orders = relationship("Order", back_populates="customer")

class Product(Base):
    __tablename__ = "product"
    
    id = Column(Integer, primary_key=True, index=True)
    label = Column(String)
    length = Column(Float)
    width = Column(Float)
    height = Column(Float)
    weight = Column(Float)
    fragility = Column(Boolean, default=False)
    requires_refrigeration = Column(Boolean, default=False)
    price = Column(Float, nullable=False)
    
    order_items = relationship("OrderItem", back_populates="product")

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customer.id"))
    order_date = Column(DateTime, default=datetime.utcnow)
    source = Column(String)
    destination = Column(String)
    status = Column(Enum(OrderStatus), default=OrderStatus.pending)
    priority = Column(Integer)
    total_amount = Column(Float, default=0.0)
    batch_id = Column(String(100), nullable=True)
    booking_id = Column(Integer, nullable=True)
    processed_at = Column(DateTime, nullable=True)
    
    customer = relationship("Customer", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("product.id"))
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    
    order = relationship("Order", back_populates="order_items")
    product = relationship("Product", back_populates="order_items")
