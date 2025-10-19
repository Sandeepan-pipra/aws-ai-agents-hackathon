const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Vehicles
  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        type: 'Tata Ace',
        registrationNumber: 'DL-01-AB-1234',
        weight: 750,
        length: 2130,
        width: 1320,
        height: 1680,
        baseRatePerKm: 12,
        status: 'available'
      }
    }),
    prisma.vehicle.create({
      data: {
        type: 'Mahindra Bolero Pickup',
        registrationNumber: 'DL-02-CD-5678',
        weight: 1250,
        length: 3050,
        width: 1750,
        height: 1800,
        baseRatePerKm: 18,
        status: 'available'
      }
    }),
    prisma.vehicle.create({
      data: {
        type: 'Tata 407',
        registrationNumber: 'DL-03-EF-9012',
        weight: 2500,
        length: 4570,
        width: 1980,
        height: 2130,
        baseRatePerKm: 25,
        status: 'available'
      }
    }),
    prisma.vehicle.create({
      data: {
        type: 'Ashok Leyland Dost',
        registrationNumber: 'DL-04-GH-3456',
        weight: 1000,
        length: 2440,
        width: 1520,
        height: 1830,
        baseRatePerKm: 15,
        status: 'available'
      }
    }),
    prisma.vehicle.create({
      data: {
        type: 'Eicher Pro 1049',
        registrationNumber: 'DL-05-IJ-7890',
        weight: 4500,
        length: 5490,
        width: 2130,
        height: 2440,
        baseRatePerKm: 35,
        status: 'available'
      }
    }),
    prisma.vehicle.create({
      data: {
        type: 'Tata LPT 1613',
        registrationNumber: 'DL-06-KL-2345',
        weight: 9000,
        length: 6100,
        width: 2440,
        height: 2740,
        baseRatePerKm: 45,
        status: 'available'
      }
    })
  ]);

  console.log(`Created ${vehicles.length} vehicles`);

  // Create Customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: 'Rajesh Warehouse Solutions',
        contactNumber: '+91-9876543210',
        email: 'rajesh@warehouse.com',
        address: '123 Industrial Area, Sector 18, Gurgaon'
      }
    }),
    prisma.customer.create({
      data: {
        name: 'Priya Logistics Hub',
        contactNumber: '+91-9876543211',
        email: 'priya@logisticshub.com',
        address: '456 Storage Complex, Noida'
      }
    }),
    prisma.customer.create({
      data: {
        name: 'Amit Trading Co.',
        contactNumber: '+91-9876543212',
        email: 'amit@trading.com',
        address: '789 Market Street, Delhi'
      }
    })
  ]);

  console.log(`Created ${customers.length} customers`);

  // Create Bookings
  const bookings = await Promise.all([
    prisma.booking.create({
      data: {
        customerId: customers[0].id,
        vehicleId: vehicles[0].id,
        pickupAddress: '123 Industrial Area, Sector 18, Gurgaon',
        deliveryAddress: '45 Retail Park, Connaught Place, Delhi',
        pickupDateTime: new Date('2024-12-20T09:00:00Z'),
        weight: 400,
        length: 2000,
        width: 1200,
        height: 1000,
        description: 'Electronics - LED TVs',
        distanceKm: 35,
        totalPrice: 920,
        status: 'confirmed',
        statusHistory: [
          { status: 'pending', timestamp: new Date('2024-12-15T10:00:00Z').toISOString() },
          { status: 'confirmed', timestamp: new Date('2024-12-15T11:00:00Z').toISOString() }
        ]
      }
    }),
    prisma.booking.create({
      data: {
        customerId: customers[1].id,
        vehicleId: vehicles[1].id,
        pickupAddress: '456 Storage Complex, Noida',
        deliveryAddress: '78 Shopping Mall, Ghaziabad',
        pickupDateTime: new Date('2024-12-22T14:00:00Z'),
        weight: 1200,
        length: 3500,
        width: 1800,
        height: 1800,
        description: 'Furniture - Office Desks',
        distanceKm: 25,
        totalPrice: 950,
        status: 'pending',
        statusHistory: [
          { status: 'pending', timestamp: new Date('2024-12-16T09:00:00Z').toISOString() }
        ]
      }
    }),
    prisma.booking.create({
      data: {
        customerId: customers[2].id,
        vehicleId: vehicles[2].id,
        pickupAddress: '789 Market Street, Delhi',
        deliveryAddress: '12 Industrial Estate, Faridabad',
        pickupDateTime: new Date('2024-12-18T08:00:00Z'),
        weight: 2500,
        length: 5000,
        width: 2200,
        height: 2200,
        description: 'Machinery Parts',
        distanceKm: 45,
        totalPrice: 2125,
        status: 'delivered',
        statusHistory: [
          { status: 'pending', timestamp: new Date('2024-12-10T10:00:00Z').toISOString() },
          { status: 'confirmed', timestamp: new Date('2024-12-10T12:00:00Z').toISOString() },
          { status: 'picked_up', timestamp: new Date('2024-12-18T08:30:00Z').toISOString() },
          { status: 'in_transit', timestamp: new Date('2024-12-18T09:00:00Z').toISOString() },
          { status: 'delivered', timestamp: new Date('2024-12-18T11:30:00Z').toISOString() }
        ]
      }
    }),
    prisma.booking.create({
      data: {
        customerId: customers[0].id,
        vehicleId: vehicles[3].id,
        pickupAddress: '123 Industrial Area, Sector 18, Gurgaon',
        deliveryAddress: '90 Residential Complex, Dwarka, Delhi',
        pickupDateTime: new Date('2024-12-25T10:00:00Z'),
        weight: 250,
        length: 1500,
        width: 1000,
        height: 800,
        description: 'Home Appliances',
        distanceKm: 28,
        totalPrice: 836,
        status: 'pending',
        statusHistory: [
          { status: 'pending', timestamp: new Date().toISOString() }
        ]
      }
    })
  ]);

  console.log(`Created ${bookings.length} bookings`);
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
