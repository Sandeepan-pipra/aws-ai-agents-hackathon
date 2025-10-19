const bookingService = require('../services/bookingService');

exports.calculatePrice = async (req, res, next) => {
  try {
    const { pickupAddress, deliveryAddress, vehicleId } = req.body;
    const pricing = await bookingService.calculatePrice(pickupAddress, deliveryAddress, vehicleId);
    res.json(pricing);
  } catch (error) {
    next(error);
  }
};

exports.createBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.createBooking(req.body);
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};

exports.getBookingById = async (req, res, next) => {
  try {
    const booking = await bookingService.getBookingById(req.params.id);
    res.json(booking);
  } catch (error) {
    next(error);
  }
};

exports.getAllBookings = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      vehicleId: req.query.vehicleId,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    const bookings = await bookingService.getAllBookings(filters);
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

exports.getCustomerBookings = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const { startDate, endDate } = req.query;
    const bookings = await bookingService.getCustomerBookings(customerId, startDate, endDate);
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const booking = await bookingService.updateBookingStatus(id, status);
    res.json(booking);
  } catch (error) {
    next(error);
  }
};

exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.cancelBooking(req.params.id);
    res.json(booking);
  } catch (error) {
    next(error);
  }
};

exports.updateLayoutKey = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { s3LayoutKey } = req.body;
    const booking = await bookingService.updateLayoutKey(id, s3LayoutKey);
    res.json(booking);
  } catch (error) {
    next(error);
  }
};
