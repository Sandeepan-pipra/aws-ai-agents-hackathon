const prisma = require('../utils/prisma');
const { AppError } = require('../utils/errors');
const { calculateDistance } = require('../utils/distance');
const vehicleService = require('./vehicleService');

class BookingService {
  validateS3LayoutKey(s3LayoutKey) {
    if (!s3LayoutKey) return true;
    const s3KeyPattern = /^[a-zA-Z0-9!_.*'()-\/]+$/;
    if (!s3KeyPattern.test(s3LayoutKey)) {
      throw new AppError('Invalid S3 layout key format', 400, 'INVALID_S3_KEY');
    }
    return true;
  }
  async calculatePrice(pickupAddress, deliveryAddress, vehicleId) {
    const vehicle = await vehicleService.getVehicleById(vehicleId);
    const distanceKm = calculateDistance(pickupAddress, deliveryAddress);
    const baseCharge = parseFloat(process.env.BASE_CHARGE) || 500;
    const distanceCharge = distanceKm * vehicle.baseRatePerKm;
    const totalPrice = baseCharge + distanceCharge;

    return {
      distanceKm,
      baseCharge,
      vehicleRatePerKm: vehicle.baseRatePerKm,
      totalPrice,
      breakdown: {
        baseCharge,
        distanceCharge
      }
    };
  }

  async createBooking(data) {

    const pickupDate = new Date(data.pickupDateTime);
    if (pickupDate <= new Date()) {
      throw new AppError('Pickup date must be in the future', 400, 'INVALID_PICKUP_DATE');
    }

    const isAvailable = await vehicleService.checkVehicleAvailability(
      data.vehicleId,
      pickupDate
    );

    if (!isAvailable) {
      throw new AppError('Vehicle is not available for the selected date', 409, 'VEHICLE_NOT_AVAILABLE');
    }

    const pricing = await this.calculatePrice(
      data.pickupAddress,
      data.deliveryAddress,
      data.vehicleId
    );

    const statusHistory = [{
      status: 'pending',
      timestamp: new Date().toISOString()
    }];

    // Support both flat and nested cargoDetails formats for backward compatibility
    const weight = data.cargoDetails?.weight ?? data.weight;
    const length = data.cargoDetails?.dimensions?.length ?? data.length;
    const width = data.cargoDetails?.dimensions?.width ?? data.width;
    const height = data.cargoDetails?.dimensions?.height ?? data.height;
    const description = data.cargoDetails?.description ?? data.description;

    // Validate s3LayoutKey if provided
    if (data.s3LayoutKey) {
      this.validateS3LayoutKey(data.s3LayoutKey);
    }

    const booking = await prisma.booking.create({
      data: {
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        pickupAddress: data.pickupAddress,
        deliveryAddress: data.deliveryAddress,
        pickupDateTime: pickupDate,
        weight,
        length,
        width,
        height,
        description,
        distanceKm: pricing.distanceKm,
        totalPrice: pricing.totalPrice,
        s3LayoutKey: data.s3LayoutKey || null,
        statusHistory
      },
      include: {
        customer: true,
        vehicle: true
      }
    });

    await prisma.vehicle.update({
      where: { id: data.vehicleId },
      data: { status: 'booked' }
    });

    return this.formatBookingResponse(booking);
  }

  async getBookingById(id) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: true
      }
    });

    if (!booking) {
      throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
    }

    return this.formatBookingResponse(booking);
  }

  async getAllBookings(filters = {}) {
    const where = {};

    if (filters.status) where.status = filters.status;
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.startDate || filters.endDate) {
      where.pickupDateTime = {};
      if (filters.startDate) where.pickupDateTime.gte = new Date(filters.startDate);
      if (filters.endDate) where.pickupDateTime.lte = new Date(filters.endDate);
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        customer: true,
        vehicle: true
      }
    });

    return bookings.map(b => this.formatBookingResponse(b));
  }

  async getCustomerBookings(customerId, startDate, endDate) {
    const where = { customerId };

    if (startDate || endDate) {
      where.pickupDateTime = {};
      if (startDate) where.pickupDateTime.gte = new Date(startDate);
      if (endDate) where.pickupDateTime.lte = new Date(endDate);
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        customer: true,
        vehicle: true
      }
    });

    return bookings.map(b => this.formatBookingResponse(b));
  }

  async updateBookingStatus(id, newStatus) {
    const booking = await prisma.booking.findUnique({ where: { id } });

    if (!booking) {
      throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
    }

    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['picked_up', 'cancelled'],
      picked_up: ['in_transit'],
      in_transit: ['delivered']
    };

    if (!validTransitions[booking.status]?.includes(newStatus)) {
      throw new AppError(
        `Cannot transition from ${booking.status} to ${newStatus}`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    const statusHistory = [...booking.statusHistory, {
      status: newStatus,
      timestamp: new Date().toISOString()
    }];

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: newStatus,
        statusHistory
      },
      include: {
        customer: true,
        vehicle: true
      }
    });

    if (newStatus === 'delivered' || newStatus === 'cancelled') {
      await prisma.vehicle.update({
        where: { id: booking.vehicleId },
        data: { status: 'available' }
      });
    } else if (newStatus === 'in_transit') {
      await prisma.vehicle.update({
        where: { id: booking.vehicleId },
        data: { status: 'in_transit' }
      });
    }

    return this.formatBookingResponse(updatedBooking);
  }

  async cancelBooking(id) {
    const booking = await prisma.booking.findUnique({ where: { id } });

    if (!booking) {
      throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw new AppError(
        'Only pending or confirmed bookings can be cancelled',
        400,
        'CANNOT_CANCEL_BOOKING'
      );
    }

    return await this.updateBookingStatus(id, 'cancelled');
  }

  async updateLayoutKey(id, s3LayoutKey) {
    const booking = await prisma.booking.findUnique({ where: { id } });
    
    if (!booking) {
      throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
    }

    this.validateS3LayoutKey(s3LayoutKey);

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { s3LayoutKey },
      include: {
        customer: true,
        vehicle: true
      }
    });

    return this.formatBookingResponse(updatedBooking);
  }

  formatBookingResponse(booking) {
    return {
      id: booking.id,
      customerId: booking.customerId,
      vehicleId: booking.vehicleId,
      pickupAddress: booking.pickupAddress,
      deliveryAddress: booking.deliveryAddress,
      pickupDateTime: booking.pickupDateTime,
      cargoDetails: {
        weight: booking.weight,
        dimensions: {
          length: booking.length,
          width: booking.width,
          height: booking.height
        },
        description: booking.description
      },
      status: booking.status,
      distanceKm: booking.distanceKm,
      totalPrice: booking.totalPrice,
      statusHistory: booking.statusHistory,
      s3LayoutKey: booking.s3LayoutKey,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    };
  }
}

module.exports = new BookingService();
