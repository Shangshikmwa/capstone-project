import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Vehicle from '../models/vehicleModel.js';
import Trip from '../models/tripsModel.js';


export const registerVehicle = asyncHandler(async (req, res) => {
  const companyId = req.company && req.company._id;
  if (!companyId) {
    res.status(401); throw new Error('Company not authenticated');
  }

  const {
    name, model, type, registrationNumber,
    terminal, route,
    seatCapacity, pricePerSeat,
    defaultDepartureTime = undefined,
    features = [], images = [], notes = '',
    createTrips = undefined
  } = req.body || {};

  if (!name || !model || !type || !registrationNumber || !terminal || !route) {
    res.status(400); throw new Error('Missing required vehicle fields: name, model, type, registrationNumber, terminal, route');
  }
  if (!seatCapacity || Number(seatCapacity) < 1) {
    res.status(400); throw new Error('seatCapacity is required and must be >= 1');
  }
  if (typeof pricePerSeat === 'undefined' || Number(pricePerSeat) < 0) {
    res.status(400); throw new Error('pricePerSeat is required and must be >= 0');
  }

  let vehicle;
  try {
    vehicle = await Vehicle.create({
      company: companyId,
      name,
      model,
      type,
      registrationNumber,
      terminal,
      route,
      seatCapacity: Number(seatCapacity),
      pricePerSeat: Number(pricePerSeat),
      defaultDepartureTime,
      features,
      images,
      notes,
    });
  } catch (err) {
    if (err && err.code === 11000) {
      res.status(409); throw new Error('A vehicle with that registrationNumber already exists for your company');
    }
    throw err;
  }

  // Optional: create initial trips if provided (not wrapped in transaction here)
  let createdTrips = [];
  if (Array.isArray(createTrips) && createTrips.length > 0) {
    const tripsToInsert = createTrips.map((t) => {
      const departureDate = t.departureDate ? new Date(t.departureDate) : null;
      if (!departureDate || Number.isNaN(departureDate.getTime())) {
        throw new Error('Invalid departureDate in createTrips. Use "YYYY-MM-DD" or valid ISO date string.');
      }
      const departureTime = t.departureTime || vehicle.defaultDepartureTime || '00:00';
      const tripRoute = t.route || vehicle.route;
      const tripPrice = (typeof t.pricePerSeat !== 'undefined') ? Number(t.pricePerSeat) : vehicle.pricePerSeat;
      const status = t.status || 'scheduled';
      return {
        company: companyId,
        vehicle: vehicle._id,
        departureDate,
        departureTime,
        route: tripRoute,
        pricePerSeat: Number(tripPrice),
        seatCapacity: vehicle.seatCapacity,
        availableSeats: vehicle.seatCapacity,
        bookingsCount: 0,
        status,
        inheritedFromVehicleVersion: vehicle.version || 1,
        notes: t.notes || '',
      };
    });

    try {
      createdTrips = await Trip.insertMany(tripsToInsert);
    } catch (err) {
      // vehicle created successfully; trips failed
      res.status(500); throw new Error(`Vehicle created but creating trips failed: ${err.message}`);
    }
  }

  res.status(201).json({
    message: 'Vehicle created',
    vehicle,
    tripsCreated: createdTrips.length,
    createdTrips
  });
});


export const listCompanyVehicles = asyncHandler(async (req, res) => {
  const companyId = req.company && req.company._id;
  if (!companyId) { res.status(401); throw new Error('Company not authenticated'); }

  const { page = 1, limit = 20, q, isAvailable, route, terminal, sort = '-createdAt' } = req.query;
  const query = { company: companyId };

  if (typeof isAvailable !== 'undefined') query.isAvailable = isAvailable === 'true';
  if (route) query.route = { $regex: route, $options: 'i' };
  if (terminal) query.terminal = { $regex: terminal, $options: 'i' };
  if (q) query.$or = [
    { name: { $regex: q, $options: 'i' } },
    { model: { $regex: q, $options: 'i' } },
    { registrationNumber: { $regex: q, $options: 'i' } }
  ];

  const skip = (Math.max(Number(page), 1) - 1) * Number(limit);
  const [total, vehicles] = await Promise.all([
    Vehicle.countDocuments(query),
    Vehicle.find(query).sort(sort).skip(skip).limit(Number(limit))
  ]);

  res.json({ total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)), vehicles });
});


export const updateVehicle = asyncHandler(async (req, res) => {
  const companyId = req.company && req.company._id;
  if (!companyId) { res.status(401); throw new Error('Company not authenticated'); }

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) { res.status(400); throw new Error('Invalid vehicle id'); }

  const vehicle = await Vehicle.findOne({ _id: id, company: companyId, isDeleted: false });
  if (!vehicle) { res.status(404); throw new Error('Vehicle not found or not owned by your company'); }

  // allowed updates
  const allowed = ['name','model','type','registrationNumber','terminal','route','isAvailable','seatCapacity','pricePerSeat','defaultDepartureTime','features','images','notes'];
  let changed = false;
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      vehicle[key] = req.body[key];
      changed = true;
    }
  }

  // if any defaults changed that should track version, increment version
  if (changed) vehicle.version = (vehicle.version || 1) + 1;

  try {
    const saved = await vehicle.save();
    res.json({ message: 'Vehicle updated', vehicle: saved });
  } catch (err) {
    if (err && err.code === 11000) {
      res.status(409); throw new Error('A vehicle with that registrationNumber already exists for your company');
    }
    throw err;
  }
});


export const deleteVehicle = asyncHandler(async (req, res) => {
    const companyId = req.company && req.company._id;
    const { id } = req.params;
  
    const vehicle = await Vehicle.findOne({ _id: id, company: companyId, isDeleted: false });
    if (!vehicle) {
      res.status(404);
      throw new Error('Vehicle not found or already deleted');
    }
  
    vehicle.isDeleted = true;
    vehicle.deletedAt = new Date();
    await vehicle.save();
  
    res.json({ message: 'Vehicle soft-deleted', id });
});
  
