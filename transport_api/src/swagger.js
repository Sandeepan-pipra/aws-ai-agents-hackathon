const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Logistics Transport Service API',
      version: '1.0.0',
      description: 'API for managing logistics transport bookings, vehicles, and customers',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        Vehicle: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string', example: 'Large Van' },
            registrationNumber: { type: 'string', example: 'ABC123' },
            maxWeightKg: { type: 'number', example: 1000 },
            lengthCm: { type: 'number', example: 300 },
            widthCm: { type: 'number', example: 200 },
            heightCm: { type: 'number', example: 200 },
            status: { type: 'string', enum: ['available', 'booked', 'in_transit', 'maintenance'] },
            baseRatePerKm: { type: 'number', example: 20 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        VehicleInput: {
          type: 'object',
          required: ['type', 'registrationNumber', 'specifications', 'baseRatePerKm'],
          properties: {
            type: { type: 'string', example: 'Large Van' },
            registrationNumber: { type: 'string', example: 'ABC123' },
            specifications: {
              type: 'object',
              properties: {
                maxWeightKg: { type: 'number', example: 1000 },
                dimensionsCm: {
                  type: 'object',
                  properties: {
                    length: { type: 'number', example: 300 },
                    width: { type: 'number', example: 200 },
                    height: { type: 'number', example: 200 }
                  }
                }
              }
            },
            baseRatePerKm: { type: 'number', example: 20 }
          }
        },
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Warehouse Owner' },
            contactNumber: { type: 'string', example: '+1234567890' },
            email: { type: 'string', example: 'owner@warehouse.com' },
            address: { type: 'string', example: '123 Warehouse St' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        CustomerInput: {
          type: 'object',
          required: ['name', 'contactNumber', 'email', 'address'],
          properties: {
            name: { type: 'string', example: 'Warehouse Owner' },
            contactNumber: { type: 'string', example: '+1234567890' },
            email: { type: 'string', example: 'owner@warehouse.com' },
            address: { type: 'string', example: '123 Warehouse St' }
          }
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            customerId: { type: 'string', format: 'uuid' },
            vehicleId: { type: 'string', format: 'uuid' },
            pickupAddress: { type: 'string', example: 'Warehouse A, Street 123' },
            deliveryAddress: { type: 'string', example: 'Store B, Avenue 456' },
            pickupDateTime: { type: 'string', format: 'date-time' },
            cargoDetails: {
              type: 'object',
              properties: {
                weightKg: { type: 'number', example: 500 },
                dimensionsCm: {
                  type: 'object',
                  properties: {
                    length: { type: 'number', example: 200 },
                    width: { type: 'number', example: 150 },
                    height: { type: 'number', example: 180 }
                  }
                },
                description: { type: 'string', example: 'Electronics' }
              }
            },
            status: { type: 'string', enum: ['pending', 'confirmed', 'picked_up', 'in_transit', 'delivered', 'cancelled'] },
            distanceKm: { type: 'number', example: 45.5 },
            totalPrice: { type: 'number', example: 1365 },
            statusHistory: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' }
                }
              }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        BookingInput: {
          type: 'object',
          required: ['customerId', 'vehicleId', 'pickupAddress', 'deliveryAddress', 'pickupDateTime', 'cargoDetails'],
          properties: {
            customerId: { type: 'string', format: 'uuid' },
            vehicleId: { type: 'string', format: 'uuid' },
            pickupAddress: { type: 'string', example: 'Warehouse A, Street 123' },
            deliveryAddress: { type: 'string', example: 'Store B, Avenue 456' },
            pickupDateTime: { type: 'string', format: 'date-time', example: '2024-12-25T10:00:00Z' },
            cargoDetails: {
              type: 'object',
              properties: {
                weightKg: { type: 'number', example: 500 },
                dimensionsCm: {
                  type: 'object',
                  properties: {
                    length: { type: 'number', example: 200 },
                    width: { type: 'number', example: 150 },
                    height: { type: 'number', example: 180 }
                  }
                },
                description: { type: 'string', example: 'Electronics' }
              }
            },
            s3LayoutKey: { type: 'string', example: 'layouts/order-123.json' }
          }
        },
        PriceCalculation: {
          type: 'object',
          properties: {
            distanceKm: { type: 'number', example: 45.5 },
            baseCharge: { type: 'number', example: 500 },
            vehicleRatePerKm: { type: 'number', example: 19 },
            totalPrice: { type: 'number', example: 1364.5 },
            breakdown: {
              type: 'object',
              properties: {
                baseCharge: { type: 'number', example: 500 },
                distanceCharge: { type: 'number', example: 864.5 }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VEHICLE_NOT_FOUND' },
                message: { type: 'string', example: 'Vehicle not found' },
                details: { type: 'object' }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
