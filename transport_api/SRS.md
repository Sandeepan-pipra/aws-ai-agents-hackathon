# Software Requirements Specification (SRS)
## Logistics Transport Service API

**Version:** 1.0  
**Date:** 7 Oct 2025  
**Project:** Logistics Transport Booking System

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and technical requirements for a logistics transport service API that enables warehouse owners to book vehicles for cargo transportation.

### 1.2 Scope
The system provides RESTful APIs for:
- Managing vehicle inventory with capacity specifications
- Booking vehicles for cargo transport
- Managing customer information
- Tracking booking status updates

### 1.3 Target Audience
- Warehouse owners/operators
- System administrators
- Development team
- API consumers

### 1.4 Definitions and Acronyms
- **API**: Application Programming Interface
- **REST**: Representational State Transfer
- **CRUD**: Create, Read, Update, Delete
- **SRS**: Software Requirements Specification

---

## 2. Overall Description

### 2.1 Product Perspective
A standalone API service that manages vehicle bookings for logistics transport. The system is designed for warehouse owners to programmatically book available vehicles based on their cargo requirements.

### 2.2 User Characteristics
- **Warehouse Owners**: Primary users who book vehicles via API
- **System Administrators**: Manage vehicle inventory and system configuration

### 2.3 Assumptions and Dependencies
- Users have internet connectivity
- Users can calculate/provide pickup and delivery addresses
- Distance calculation service is available (external or internal)
- Users are responsible for selecting appropriate vehicles based on cargo specifications

---

## 3. System Features and Requirements

### 3.1 Functional Requirements

#### 3.1.1 Vehicle Management

**FR-V-001: List All Vehicles**
- **Description**: Retrieve all vehicles with their specifications
- **Input**: None (optional filters: status, vehicle type)
- **Output**: List of vehicles with ID, type, registration, capacity specs, status, rate
- **Priority**: High

**FR-V-002: Get Vehicle Details**
- **Description**: Retrieve specific vehicle information
- **Input**: Vehicle ID
- **Output**: Complete vehicle details
- **Priority**: High

**FR-V-003: Check Vehicle Availability**
- **Description**: Check if a vehicle is available for a specific date
- **Input**: Vehicle ID, date
- **Output**: Boolean (available/not available)
- **Priority**: High

**FR-V-004: Get Available Vehicles by Date**
- **Description**: List all vehicles available for a specific date
- **Input**: Date
- **Output**: List of available vehicles
- **Priority**: High

**FR-V-005: Add Vehicle**
- **Description**: Register a new vehicle in the system
- **Input**: Vehicle type, registration, capacity specs, base rate
- **Output**: Created vehicle with ID
- **Priority**: Medium

**FR-V-006: Update Vehicle**
- **Description**: Update vehicle information or status
- **Input**: Vehicle ID, updated fields
- **Output**: Updated vehicle details
- **Priority**: Medium

**FR-V-007: Delete Vehicle**
- **Description**: Remove vehicle from system
- **Input**: Vehicle ID
- **Output**: Confirmation
- **Priority**: Low
- **Constraint**: Cannot delete if active bookings exist

#### 3.1.2 Customer Management

**FR-C-001: Create Customer**
- **Description**: Register a new customer (warehouse owner)
- **Input**: Name, contact number, email, address
- **Output**: Created customer with ID
- **Priority**: High

**FR-C-002: Get Customer Details**
- **Description**: Retrieve customer information
- **Input**: Customer ID
- **Output**: Complete customer details
- **Priority**: High

**FR-C-003: Update Customer**
- **Description**: Update customer information
- **Input**: Customer ID, updated fields
- **Output**: Updated customer details
- **Priority**: Medium

**FR-C-004: List Customers**
- **Description**: Retrieve all customers
- **Input**: None (optional pagination)
- **Output**: List of customers
- **Priority**: Low

#### 3.1.3 Booking Management

**FR-B-001: Calculate Price Estimate**
- **Description**: Calculate booking price before creating booking
- **Input**: Pickup address, delivery address, vehicle ID
- **Output**: Estimated price, distance
- **Priority**: High
- **Formula**: Price = Base Charge + (Distance × Vehicle Rate)

**FR-B-002: Create Booking**
- **Description**: Create a new vehicle booking
- **Input**: 
  - Customer ID
  - Vehicle ID
  - Pickup address
  - Delivery address
  - Pickup date & time
  - Cargo details (weight, dimensions, description)
- **Output**: Booking confirmation with booking ID, price, status
- **Priority**: High
- **Validations**:
  - Vehicle must be available for the date
  - Pickup date must be in the future
  - All required fields must be provided

**FR-B-003: Get Booking Details**
- **Description**: Retrieve complete booking information
- **Input**: Booking ID
- **Output**: Complete booking details including status history
- **Priority**: High

**FR-B-004: Update Booking Status**
- **Description**: Update the status of a booking
- **Input**: Booking ID, new status
- **Output**: Updated booking with new status
- **Priority**: High
- **Valid Transitions**:
  - pending → confirmed
  - confirmed → picked-up
  - picked-up → in-transit
  - in-transit → delivered
  - pending/confirmed → cancelled

**FR-B-005: Cancel Booking**
- **Description**: Cancel an existing booking
- **Input**: Booking ID
- **Output**: Cancellation confirmation
- **Priority**: High
- **Constraint**: Only pending or confirmed bookings can be cancelled

**FR-B-006: Get Customer Bookings**
- **Description**: Retrieve all bookings for a customer
- **Input**: Customer ID, optional date range
- **Output**: List of bookings
- **Priority**: High

**FR-B-007: List All Bookings**
- **Description**: Retrieve all bookings in the system
- **Input**: Optional filters (status, date range, vehicle ID)
- **Output**: List of bookings
- **Priority**: Medium

### 3.2 Data Requirements

#### 3.2.1 Vehicle Entity
```js
Vehicle {
  id: string (UUID, primary key)
  type: string (e.g., "Small Van", "Large Van", "Truck")
  registrationNumber: string (unique)
  specifications: {
    maxWeightKg: number
    dimensionsCm: {
      length: number
      width: number
      height: number
    }
  }
  status: enum ["available", "booked", "in-transit", "maintenance"]
  baseRatePerKm: number (decimal)
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### 3.2.2 Customer Entity
```js
Customer {
  id: string (UUID, primary key)
  name: string
  contactNumber: string
  email: string (unique)
  address: string
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### 3.2.3 Booking Entity
```js
Booking {
  id: string (UUID, primary key)
  customerId: string (foreign key)
  vehicleId: string (foreign key)
  pickupAddress: string
  deliveryAddress: string
  pickupDateTime: timestamp
  cargoDetails: {
    weightKg: number
    dimensionsCm: {
      length: number
      width: number
      height: number
    }
    description: string
  }
  status: enum ["pending", "confirmed", "picked-up", "in-transit", "delivered", "cancelled"]
  distanceKm: number (decimal)
  totalPrice: number (decimal)
  statusHistory: array [{
    status: string
    timestamp: timestamp
  }]
  createdAt: timestamp
  updatedAt: timestamp
}
```

### 3.3 Business Rules

**BR-001: Vehicle Availability**
- A vehicle can have only one active booking per day
- Vehicle status must be "available" to accept new bookings
- When booking is created, vehicle status changes to "booked"
- When booking is delivered or cancelled, vehicle status returns to "available"

**BR-002: Booking Date Constraints**
- Bookings can only be created for future dates
- Minimum advance booking: same day allowed
- Pickup date/time must be specified

**BR-003: Status Progression**
- Status can only move forward in the defined sequence
- Exception: cancellation allowed from pending or confirmed status only
- Each status change is recorded in status history with timestamp

**BR-004: Pricing Calculation**
- Base charge: system-wide configurable value
- Price = Base Charge + (Distance × Vehicle Base Rate Per Km)
- Price is calculated and fixed at booking creation time

**BR-005: Cancellation Policy**
- Only bookings with status "pending" or "confirmed" can be cancelled
- Cancelled bookings free up the vehicle for that date
- Cancellation updates vehicle status back to "available"

**BR-006: Data Validation**
- All cargo dimensions and weight must be positive numbers
- Customer email must be unique
- Vehicle registration number must be unique
- All required fields must be provided

### 3.4 API Specifications

#### 3.4.1 API Endpoints

**Vehicle Endpoints**
```
GET    /api/vehicles                    - List all vehicles
GET    /api/vehicles/{id}               - Get vehicle details
GET    /api/vehicles/available?date={date} - Get available vehicles for date
GET    /api/vehicles/{id}/availability?date={date} - Check specific vehicle availability
POST   /api/vehicles                    - Create new vehicle
PUT    /api/vehicles/{id}               - Update vehicle
DELETE /api/vehicles/{id}               - Delete vehicle
```

**Customer Endpoints**
```
GET    /api/customers                   - List all customers
GET    /api/customers/{id}              - Get customer details
POST   /api/customers                   - Create new customer
PUT    /api/customers/{id}              - Update customer
```

**Booking Endpoints**
```
GET    /api/bookings                    - List all bookings (with filters)
GET    /api/bookings/{id}               - Get booking details
GET    /api/customers/{id}/bookings     - Get customer bookings
POST   /api/bookings/calculate-price    - Calculate price estimate
POST   /api/bookings                    - Create new booking
PATCH  /api/bookings/{id}/status        - Update booking status
DELETE /api/bookings/{id}               - Cancel booking
```

#### 3.4.2 Request/Response Examples

**Create Booking Request**
```json
POST /api/bookings
{
  "customerId": "uuid",
  "vehicleId": "uuid",
  "pickupAddress": "Warehouse A, Street 123, City",
  "deliveryAddress": "Store B, Avenue 456, City",
  "pickupDateTime": "2024-12-25T10:00:00Z",
  "cargoDetails": {
    "weightKg": 500,
    "dimensionsCm": {
      "length": 200,
      "width": 150,
      "height": 180
    },
    "description": "Electronics equipment"
  }
}
```

**Create Booking Response**
```json
{
  "id": "booking-uuid",
  "customerId": "uuid",
  "vehicleId": "uuid",
  "pickupAddress": "Warehouse A, Street 123, City",
  "deliveryAddress": "Store B, Avenue 456, City",
  "pickupDateTime": "2024-12-25T10:00:00Z",
  "cargoDetails": {
    "weightKg": 500,
    "dimensionsCm": {
      "length": 200,
      "width": 150,
      "height": 180
    },
    "description": "Electronics equipment"
  },
  "status": "pending",
  "distanceKm": 45.5,
  "totalPrice": 1365.0,
  "statusHistory": [
    {
      "status": "pending",
      "timestamp": "2024-12-20T14:30:00Z"
    }
  ],
  "createdAt": "2024-12-20T14:30:00Z",
  "updatedAt": "2024-12-20T14:30:00Z"
}
```

**Update Status Request**
```json
PATCH /api/bookings/{id}/status
{
  "status": "confirmed"
}
```

**Calculate Price Request**
```json
POST /api/bookings/calculate-price
{
  "pickupAddress": "Warehouse A, Street 123, City",
  "deliveryAddress": "Store B, Avenue 456, City",
  "vehicleId": "uuid"
}
```

**Calculate Price Response**
```json
{
  "distanceKm": 45.5,
  "baseCharge": 500,
  "vehicleRatePerKm": 19,
  "totalPrice": 1364.5,
  "breakdown": {
    "baseCharge": 500,
    "distanceCharge": 864.5
  }
}
```

#### 3.4.3 HTTP Status Codes
- **200 OK**: Successful GET, PUT, PATCH requests
- **201 Created**: Successful POST requests
- **204 No Content**: Successful DELETE requests
- **400 Bad Request**: Invalid input data
- **404 Not Found**: Resource not found
- **409 Conflict**: Business rule violation (e.g., vehicle not available)
- **500 Internal Server Error**: Server-side errors

#### 3.4.4 Error Response Format
```json
{
  "error": {
    "code": "VEHICLE_NOT_AVAILABLE",
    "message": "Vehicle is not available for the selected date",
    "details": {
      "vehicleId": "uuid",
      "requestedDate": "2024-12-25"
    }
  }
}
```

### 3.5 Non-Functional Requirements

#### 3.5.1 Performance
- **NFR-P-001**: API response time should be < 500ms for 95% of requests
- **NFR-P-002**: System should support at least 100 concurrent API requests
- **NFR-P-003**: Database queries should be optimized with proper indexing

#### 3.5.2 Security
- **NFR-S-001**: All API endpoints must use HTTPS
- **NFR-S-002**: API authentication required (API key or OAuth2)
- **NFR-S-003**: Input validation on all API endpoints
- **NFR-S-004**: SQL injection and XSS protection

#### 3.5.3 Reliability
- **NFR-R-001**: System uptime of 99.5%
- **NFR-R-002**: Automated backup of database daily
- **NFR-R-003**: Transaction support for booking operations

#### 3.5.4 Scalability
- **NFR-SC-001**: Database should support at least 10,000 bookings
- **NFR-SC-002**: System should be horizontally scalable

#### 3.5.5 Maintainability
- **NFR-M-001**: Code should follow standard coding conventions
- **NFR-M-002**: API documentation should be auto-generated (Swagger/OpenAPI)
- **NFR-M-003**: Comprehensive logging for debugging and monitoring

#### 3.5.6 Usability
- **NFR-U-001**: API should follow RESTful conventions
- **NFR-U-002**: Clear and consistent error messages
- **NFR-U-003**: API versioning support

---

## 4. System Constraints

### 4.1 Technical Constraints
- RESTful API architecture
- JSON format for request/response
- Relational database for data persistence
- Distance calculation requires external service or algorithm

### 4.2 Business Constraints
- Single booking per vehicle per day
- No real-time vehicle tracking in current version
- Manual status updates (no automatic GPS-based updates)

---

## 5. Future Scope

The following features are identified for future releases:

### 5.1 Driver Management
- Driver entity with assignment to vehicles
- Driver availability and scheduling
- Driver contact information and license details

### 5.2 Real-time Tracking
- GPS integration for live vehicle location
- Real-time ETA calculations
- Location history and route tracking

### 5.3 Advanced Capacity Matching
- Automatic vehicle recommendation based on cargo
- Multi-cargo consolidation
- Load optimization algorithms

### 5.4 Route Optimization
- Multi-stop delivery support
- Optimal route calculation
- Traffic-aware routing

### 5.5 Payment Integration
- Online payment processing
- Multiple payment methods
- Invoice generation
- Refund management

### 5.6 Notifications
- SMS/Email notifications for status updates
- Push notifications
- Automated reminders

### 5.7 Analytics and Reporting
- Booking analytics dashboard
- Vehicle utilization reports
- Revenue reports
- Customer insights

### 5.8 Advanced Scheduling
- Recurring bookings
- Bulk booking creation
- Time slot management
- Buffer time configuration

### 5.9 Rating and Feedback
- Customer ratings for service
- Feedback collection
- Service quality metrics

### 5.10 Multi-tenancy
- Support for multiple warehouse owners
- Role-based access control
- Organization management

---

## 6. Acceptance Criteria

### 6.1 Functional Acceptance
- All API endpoints return correct responses as per specification
- Business rules are enforced correctly
- Data validation works as expected
- Status transitions follow defined workflow

### 6.2 Technical Acceptance
- API documentation is complete and accurate
- All non-functional requirements are met
- Unit test coverage > 80%
- Integration tests for critical workflows pass
- Security vulnerabilities addressed

### 6.3 User Acceptance
- Warehouse owner can successfully book vehicles via API
- Price calculation is accurate
- Booking status updates work correctly
- Vehicle availability is correctly reflected

---

## 7. Appendix

### 7.1 Sample Use Case Flow

**Use Case: Warehouse Owner Books a Vehicle**

1. Warehouse owner calls GET /api/vehicles/available?date=2024-12-25
2. System returns list of available vehicles with specifications
3. Owner reviews vehicle capacities and selects appropriate vehicle
4. Owner calls POST /api/bookings/calculate-price with addresses and vehicle ID
5. System returns price estimate
6. Owner calls POST /api/bookings with complete booking details
7. System validates availability, creates booking, returns confirmation
8. System updates vehicle status to "booked" for that date
9. Later, admin calls PATCH /api/bookings/{id}/status to update status to "confirmed"
10. Process continues through status updates until "delivered"

### 7.2 Database Indexes
Recommended indexes for performance:
- Vehicle: registrationNumber (unique), status
- Customer: email (unique)
- Booking: customerId, vehicleId, pickupDateTime, status
- Composite index: (vehicleId, pickupDateTime) for availability checks

### 7.3 Configuration Parameters
- Base charge for pricing calculation
- System timezone
- Date format standards
- API rate limiting thresholds

---

**Document Version History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 7 Oct 2025 | System Architect | Initial SRS document |

