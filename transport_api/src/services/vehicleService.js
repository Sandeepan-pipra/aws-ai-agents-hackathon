const prisma = require('../utils/prisma');
const { AppError } = require('../utils/errors');

class VehicleService {
  async getAllVehicles(filters = {}) {
    return await prisma.vehicle.findMany({
      where: filters
    });
  }

  async getVehicleById(id) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
    }
    return vehicle;
  }

  async getAvailableVehicles(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedVehicleIds = await prisma.booking.findMany({
      where: {
        pickupDateTime: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: { notIn: ['cancelled', 'delivered'] }
      },
      select: { vehicleId: true }
    });

    const bookedIds = bookedVehicleIds.map(b => b.vehicleId);

    return await prisma.vehicle.findMany({
      where: {
        id: { notIn: bookedIds },
        status: 'available'
      }
    });
  }

  async checkVehicleAvailability(vehicleId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const booking = await prisma.booking.findFirst({
      where: {
        vehicleId,
        pickupDateTime: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: { notIn: ['cancelled', 'delivered'] }
      }
    });

    return !booking;
  }

  async createVehicle(data) {
    const existing = await prisma.vehicle.findUnique({
      where: { registrationNumber: data.registrationNumber }
    });
    
    if (existing) {
      throw new AppError('Vehicle with this registration number already exists', 409, 'DUPLICATE_REGISTRATION');
    }

    return await prisma.vehicle.create({ data });
  }

  async updateVehicle(id, data) {
    await this.getVehicleById(id);
    return await prisma.vehicle.update({
      where: { id },
      data
    });
  }

  async deleteVehicle(id) {
    const activeBookings = await prisma.booking.count({
      where: {
        vehicleId: id,
        status: { notIn: ['cancelled', 'delivered'] }
      }
    });

    if (activeBookings > 0) {
      throw new AppError('Cannot delete vehicle with active bookings', 409, 'ACTIVE_BOOKINGS_EXIST');
    }

    await prisma.vehicle.delete({ where: { id } });
  }
}

module.exports = new VehicleService();
