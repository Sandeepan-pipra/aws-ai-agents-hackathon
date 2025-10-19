from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import products, customers, orders

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Order Management System",
    description="A simple order management system with products, customers, and orders",
    version="1.0.0",
    openapi_url="/api/openapi.json",
    swagger_ui_parameters={
        "customCss": ".swagger-ui .info .title small, .swagger-ui .info .title small + br, .swagger-ui .info .title small + br + a { display: none !important; }"
    },
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)


@app.get("/")
def root():
    return {"message": "Order Management System API"}
