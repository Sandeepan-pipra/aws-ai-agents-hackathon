const vehicleService = require('../services/vehicleService');

exports.getAllVehicles = async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    const vehicles = await vehicleService.getAllVehicles(filters);
    res.json(vehicles);
  } catch (error) {
    next(error);
  }
};

exports.getVehicleById = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.getVehicleById(req.params.id);
    res.json(vehicle);
  } catch (error) {
    next(error);
  }
};

exports.getAvailableVehicles = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: { code: 'MISSING_DATE', message: 'Date parameter is required' } });
    }
    const vehicles = await vehicleService.getAvailableVehicles(date);
    res.json(vehicles);
  } catch (error) {
    next(error);
  }
};

exports.checkVehicleAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: { code: 'MISSING_DATE', message: 'Date parameter is required' } });
    }
    const isAvailable = await vehicleService.checkVehicleAvailability(id, date);
    res.json({ available: isAvailable });
  } catch (error) {
    next(error);
  }
};

exports.createVehicle = async (req, res, next) => {
  try {
    const data = {
      type: req.body.type,
      registrationNumber: req.body.registrationNumber,
      weight: req.body.specifications.weight,
      length: req.body.specifications.dimensions.length,
      width: req.body.specifications.dimensions.width,
      height: req.body.specifications.dimensions.height,
      baseRatePerKm: req.body.baseRatePerKm
    };
    const vehicle = await vehicleService.createVehicle(data);
    res.status(201).json(vehicle);
  } catch (error) {
    next(error);
  }
};

exports.updateVehicle = async (req, res, next) => {
  try {
    const data = {};
    if (req.body.type) data.type = req.body.type;
    if (req.body.status) data.status = req.body.status;
    if (req.body.baseRatePerKm) data.baseRatePerKm = req.body.baseRatePerKm;
    if (req.body.specifications) {
      if (req.body.specifications.weight) data.weight = req.body.specifications.weight;
      if (req.body.specifications.dimensions) {
        if (req.body.specifications.dimensions.length) data.length = req.body.specifications.dimensions.length;
        if (req.body.specifications.dimensions.width) data.width = req.body.specifications.dimensions.width;
        if (req.body.specifications.dimensions.height) data.height = req.body.specifications.dimensions.height;
      }
    }
    const vehicle = await vehicleService.updateVehicle(req.params.id, data);
    res.json(vehicle);
  } catch (error) {
    next(error);
  }
};

exports.deleteVehicle = async (req, res, next) => {
  try {
    await vehicleService.deleteVehicle(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
