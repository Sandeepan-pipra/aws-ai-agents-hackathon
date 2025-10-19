# Logistics Transport Service API

A RESTful API service for managing logistics transport bookings, vehicles, and customers.

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)

## Setup

### 1. Install PostgreSQL

**macOS (using Homebrew)**:
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows**:
Download and install from https://www.postgresql.org/download/windows/

### 2. Create Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE logistics_db;
CREATE USER logistics_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE logistics_db TO logistics_user;
\q
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` file:
```
DATABASE_URL="postgresql://logistics_user:your_password@localhost:5432/logistics_db"
PORT=3000
BASE_CHARGE=500
NODE_ENV=development
```

### 5. Setup Database Schema

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 6. Start the Server

```bash
npm run dev
```

Server will start at http://localhost:3000

## API Documentation

Interactive API documentation is available via Swagger UI:

**Swagger UI**: http://localhost:3000/api-docs

### API Endpoints

### Vehicles
- `GET /api/vehicles` - List all vehicles
- `GET /api/vehicles/:id` - Get vehicle details
- `GET /api/vehicles/available?date=YYYY-MM-DD` - Get available vehicles
- `GET /api/vehicles/:id/availability?date=YYYY-MM-DD` - Check availability
- `POST /api/vehicles` - Create vehicle
- `PUT /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Delete vehicle

### Customers
- `GET /api/customers` - List all customers
- `GET /api/customers/:id` - Get customer details
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer

### Bookings
- `GET /api/bookings` - List all bookings
- `GET /api/bookings/:id` - Get booking details
- `GET /api/customers/:customerId/bookings` - Get customer bookings
- `POST /api/bookings/calculate-price` - Calculate price
- `POST /api/bookings` - Create booking
- `PATCH /api/bookings/:id/status` - Update status
- `DELETE /api/bookings/:id` - Cancel booking

## Example Requests

### Create Vehicle
```bash
curl -X POST http://localhost:3000/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Large Van",
    "registrationNumber": "ABC123",
    "specifications": {
      "maxWeightKg": 1000,
      "dimensionsCm": {
        "length": 300,
        "width": 200,
        "height": 200
      }
    },
    "baseRatePerKm": 20
  }'
```

### Create Customer
```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Warehouse Owner",
    "contactNumber": "+1234567890",
    "email": "owner@warehouse.com",
    "address": "123 Warehouse St"
  }'
```

### Create Booking
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-uuid",
    "vehicleId": "vehicle-uuid",
    "pickupAddress": "Warehouse A, Street 123",
    "deliveryAddress": "Store B, Avenue 456",
    "pickupDateTime": "2024-12-25T10:00:00Z",
    "cargoDetails": {
      "weightKg": 500,
      "dimensionsCm": {
        "length": 200,
        "width": 150,
        "height": 180
      },
      "description": "Electronics"
    }
  }'
```

## Database Schema

See `prisma/schema.prisma` for complete schema definition.

## Tech Stack

- Node.js + Express
- PostgreSQL
- Prisma ORM
