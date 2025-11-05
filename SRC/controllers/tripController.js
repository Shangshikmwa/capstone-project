import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Vehicle from '../models/vehicleModel.js';
import Trip from '../models/tripsModel.js';
import { generateSeatNumbers } from '../utils/seatGenerator.js';

export const createTripForVehicle = asyncHandler(async (req, res) => {
  const companyId = req.company && req.company._id;
  if (!companyId) { res.status(401); throw new Error('Company not authenticated'); }

  const { vehicleId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(vehicleId)) { res.status(400); throw new Error('Invalid vehicleId'); }

  const vehicle = await Vehicle.findOne({ _id: vehicleId, company: companyId, isDeleted: false });
  if (!vehicle) { res.status(404); throw new Error('Vehicle not found or not owned by your company'); }

  const { departureDate, departureTime, route, pricePerSeat, status = 'scheduled', notes = '', metadata = {} } = req.body || {};
  if (!departureDate) { res.status(400); throw new Error('departureDate is required (YYYY-MM-DD)'); }

  const rawDate = new Date(departureDate);
  if (!rawDate || Number.isNaN(rawDate.getTime())) { res.status(400); throw new Error('Invalid departureDate'); }
  const depStart = new Date(Date.UTC(rawDate.getUTCFullYear(), rawDate.getUTCMonth(), rawDate.getUTCDate()));

  const dTime = (departureTime || vehicle.defaultDepartureTime || '00:00').trim();
  if (!/^\d{2}:\d{2}$/.test(dTime)) { res.status(400); throw new Error('departureTime must be "HH:mm"'); }
  const [hh, mm] = dTime.split(':').map(Number);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) { res.status(400); throw new Error('departureTime hour must be 00-23 and minutes 00-59.'); }

  const tripRoute = route || vehicle.route;
  const tripPrice = (typeof pricePerSeat !== 'undefined') ? Number(pricePerSeat) : Number(vehicle.pricePerSeat);

  const exists = await Trip.exists({
    vehicle: vehicle._id,
    departureDate: { $gte: depStart, $lt: new Date(depStart.getTime() + 24*60*60*1000) },
    departureTime: dTime,
    status: { $ne: 'cancelled' },
    isDeleted: false
  });
  if (exists) { res.status(409); throw new Error('A trip for this vehicle at that date/time already exists'); }

  const seatNumbers = generateSeatNumbers(Number(vehicle.seatCapacity), { seatsPerRow: 4, style: 'alpha' });
  let finalSeatNumbers = seatNumbers;
  if (seatNumbers.length > vehicle.seatCapacity) finalSeatNumbers = seatNumbers.slice(0, vehicle.seatCapacity);
  else if (seatNumbers.length < vehicle.seatCapacity) {
    const startIndex = seatNumbers.length + 1;
    for (let i = startIndex; i <= vehicle.seatCapacity; i++) finalSeatNumbers.push(String(i));
  }
  const seats = finalSeatNumbers.map(sn => ({ seatNumber: sn, isAvailable: true, bookingId: null }));

  const tripDoc = {
    company: companyId,
    vehicle: vehicle._id,
    departureDate: depStart,
    departureTime: dTime,
    route: tripRoute,
    pricePerSeat: tripPrice,
    seatCapacity: vehicle.seatCapacity,
    availableSeats: seats.length,
    seats,
    bookingsCount: 0,
    status,
    inheritedFromVehicleVersion: vehicle.version || 1,
    notes,
    metadata
  };

  const trip = await Trip.create(tripDoc);
  res.status(201).json({ message: 'Trip created', trip });
});
