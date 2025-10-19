from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# Product schemas
class ProductBase(BaseModel):
    label: str
    length: float
    width: float
    height: float
    weight: float
    fragility: bool = False
    requires_refrigeration: bool = False
    price: float

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    
    class Config:
        from_attributes = True

# Customer schemas
class CustomerBase(BaseModel):
    name: str
    email: EmailStr
    city: Optional[str] = None
    pin_code: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class Customer(CustomerBase):
    id: int
    
    class Config:
        from_attributes = True

# OrderItem schemas
class OrderItemBase(BaseModel):
    product_id: int
    quantity: int

class OrderItemCreate(OrderItemBase):
    pass

class OrderItem(OrderItemBase):
    id: int
    unit_price: float
    product_label: Optional[str] = None
    product_price: Optional[float] = None
    
    class Config:
        from_attributes = True

# Order schemas
class OrderBase(BaseModel):
    source: Optional[str] = None
    destination: Optional[str] = None
    priority: Optional[int] = None

class OrderCreate(OrderBase):
    customer_id: int
    items: List[OrderItemCreate]

class OrderStatusUpdate(BaseModel):
    status: str

class Order(OrderBase):
    id: int
    customer_id: int
    status: str
    order_date: datetime
    total_amount: float
    batch_id: Optional[str] = None
    booking_id: Optional[int] = None
    processed_at: Optional[datetime] = None
    order_items: List[OrderItem] = []
    
    class Config:
        from_attributes = True