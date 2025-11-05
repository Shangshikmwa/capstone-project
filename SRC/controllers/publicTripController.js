// controllers/publicTripController.js
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Trip from '../models/tripsModel.js';
import Booking from '../models/bookingModel.js';
import { generateBookingRef } from '../utils/refGenerator.js';

export const getTrips = asyncHandler(async (req, res) => {
  const { from, to, date, page = 1, limit = 20, minSeats, priceMin, priceMax, sort = 'departureDate' } = req.query;
  const query = { status: 'scheduled', isDeleted: false };

  if (from && to) query.route = { $regex: `${from}\\s*-\\s*${to}`, $options: 'i' };
  else if (req.query.route) query.route = { $regex: req.query.route, $options: 'i' };
  else if (from) query.route = { $regex: from, $options: 'i' };

  if (date) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) { res.status(400); throw new Error('Invalid date'); }
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
    query.departureDate = { $gte: start, $lt: end };
  } else {
    query.departureDate = { $gte: new Date(Date.now() - 24*60*60*1000) };
  }

  if (minSeats) query.availableSeats = { $gte: Number(minSeats) };
  if (priceMin || priceMax) {
    query.pricePerSeat = {};
    if (priceMin) query.pricePerSeat.$gte = Number(priceMin);
    if (priceMax) query.pricePerSeat.$lte = Number(priceMax);
  }

  const skip = (Math.max(Number(page), 1) - 1) * Number(limit);
  const sortMap = { price: 'pricePerSeat', time: 'departureTime', departureDate: 'departureDate' };
  const sortField = sortMap[sort] || 'departureDate';

  const [total, trips] = await Promise.all([
    Trip.countDocuments(query),
    Trip.find(query).sort({ [sortField]: 1 }).skip(skip).limit(Number(limit)).populate('vehicle', 'name model type registrationNumber terminal features').populate('company', 'name logoUrl')
  ]);

  const mapped = trips.map((t) => {
    const company = t.company || {};
    const vehicle = t.vehicle || {};
    const depDateISO = t.departureDate.toISOString().slice(0, 10);
    const combined = t.combinedDeparture ? t.combinedDeparture.toISOString() : null;
    const arrival = t.computedArrival ? t.computedArrival.toISOString() : null;
    return {
      tripId: t._id,
      company: { id: company._id, name: company.name, logoUrl: company.logoUrl || null },
      vehicle: { id: vehicle._id, name: vehicle.name, model: vehicle.model, type: vehicle.type },
      route: { from: (t.route || '').split('-')[0]?.trim() || null, to: (t.route || '').split('-')[1]?.trim() || null, display: t.route, terminalFrom: vehicle.terminal || null, terminalTo: null },
      departure: { date: depDateISO, time: t.departureTime, combined },
      arrival: { time: arrival ? new Date(arrival).toISOString().slice(11,16) : null, combined: arrival, duration: t.durationMinutes ? `${Math.floor(t.durationMinutes/60)}h${t.durationMinutes%60}m` : null },
      price: { amount: t.pricePerSeat, currency: 'NGN', display: `₦${t.pricePerSeat.toLocaleString()}` },
      availableSeats: t.availableSeats,
      features: vehicle.features || [],
      isAvailable: t.status === 'scheduled' && t.availableSeats > 0 && !t.isDeleted,
      cta: { label: t.availableSeats > 0 ? 'Book Now' : 'Sold Out', actionUrl: `/book/${t._id}` }
    };
  });

  res.json({ total, page: Number(page), limit: Number(limit), pages: Math.ceil(total/Number(limit)), trips: mapped });
});

export const getTripById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) { res.status(400); throw new Error('Invalid trip id'); }
  const trip = await Trip.findOne({ _id: id, isDeleted: false }).populate('vehicle', 'name model type registrationNumber terminal features').populate('company', 'name logoUrl');
  if (!trip) { res.status(404); throw new Error('Trip not found'); }

  const depDateISO = trip.departureDate.toISOString().slice(0,10);
  const combined = trip.combinedDeparture ? trip.combinedDeparture.toISOString() : null;
  const arrival = trip.computedArrival ? trip.computedArrival.toISOString() : null;

  res.json({
    tripId: trip._id,
    company: { id: trip.company._id, name: trip.company.name, logoUrl: trip.company.logoUrl || null },
    vehicle: { id: trip.vehicle._id, name: trip.vehicle.name, model: trip.vehicle.model, type: trip.vehicle.type, registrationNumber: trip.vehicle.registrationNumber, terminal: trip.vehicle.terminal },
    route: trip.route,
    departure: { date: depDateISO, time: trip.departureTime, combined },
    arrival: { combined: arrival, duration: trip.durationMinutes ? `${Math.floor(trip.durationMinutes/60)}h${trip.durationMinutes%60}m` : null },
    price: { amount: trip.pricePerSeat, currency: 'NGN', display: `₦${trip.pricePerSeat.toLocaleString()}` },
    availableSeats: trip.availableSeats,
    seats: trip.seats.map(s => ({ seatNumber: s.seatNumber, isAvailable: s.isAvailable })),
    status: trip.status,
    notes: trip.notes,
    metadata: trip.metadata
  });
});


export const bookTrip = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { seatNumbers = null, seatsCount = null, customer, paymentMethod = 'unpaid' } = req.body || {};

  if (!customer || !customer.name || !customer.phone) { res.status(400); throw new Error('Customer name and phone are required'); }
  if (!mongoose.Types.ObjectId.isValid(id)) { res.status(400); throw new Error('Invalid trip id'); }

  const trip = await Trip.findOne({ _id: id, isDeleted: false });
  if (!trip) { res.status(404); throw new Error('Trip not found'); }
  if (trip.status !== 'scheduled') { res.status(400); throw new Error('Trip is not schedulable'); }

  const toBookCount = Array.isArray(seatNumbers) && seatNumbers.length ? seatNumbers.length : (seatsCount ? Number(seatsCount) : 1);
  if (!Number.isInteger(toBookCount) || toBookCount <= 0) { res.status(400); throw new Error('Invalid seats count'); }
  if (trip.availableSeats < toBookCount) { res.status(409); throw new Error('Not enough seats available'); }

  // If seatNumbers provided: validate format and uniqueness
  let seatsRequested = [];
  if (Array.isArray(seatNumbers) && seatNumbers.length) {
    const uniq = new Set(seatNumbers.map(String));
    if (uniq.size !== seatNumbers.length) { res.status(400); throw new Error('Duplicate seat numbers in request'); }
    seatsRequested = seatNumbers.map(String);
  }

  // If no specific seats requested, pick first N available
  if (!seatsRequested.length) {
    seatsRequested = [];
    for (const s of trip.seats) {
      if (s.isAvailable) seatsRequested.push(s.seatNumber);
      if (seatsRequested.length === toBookCount) break;
    }
    if (seatsRequested.length !== toBookCount) { res.status(409); throw new Error('Not enough available seats to auto-assign'); }
  }

  // Transactional booking if possible
  const BookingModel = Booking;
  const sessionAvailable = typeof mongoose.startSession === 'function';

  const bookingRef = generateBookingRef();

  if (sessionAvailable) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // reload trip inside session
      const freshTrip = await Trip.findOne({ _id: trip._id }).session(session);
      if (!freshTrip || freshTrip.isDeleted || freshTrip.status !== 'scheduled') {
        await session.abortTransaction(); session.endSession();
        res.status(400); throw new Error('Trip no longer available');
      }
      if (freshTrip.availableSeats < seatsRequested.length) {
        await session.abortTransaction(); session.endSession();
        res.status(409); throw new Error('Not enough seats available');
      }

      // ensure requested seats are available
      const seatMap = new Map(freshTrip.seats.map(s => [s.seatNumber, s.isAvailable]));
      const unavailable = seatsRequested.filter(sn => !seatMap.has(sn) || seatMap.get(sn) === false);
      if (unavailable.length) {
        await session.abortTransaction(); session.endSession();
        res.status(409); throw new Error(`Seats not available: ${unavailable.join(',')}`);
      }

      // create booking doc
      const bookingDoc = {
        company: freshTrip.company,
        trip: freshTrip._id,
        vehicle: freshTrip.vehicle,
        user: req.user ? req.user._id : null,
        seatNumbers: seatsRequested,
        seats: seatsRequested.length,
        pricePerSeat: freshTrip.pricePerSeat,
        totalAmount: seatsRequested.length * freshTrip.pricePerSeat,
        customer: { name: customer.name, phone: customer.phone, email: customer.email || '' },
        paymentMethod,
        paymentStatus: paymentMethod === 'unpaid' ? 'pending' : 'pending',
        reference: bookingRef,
        status: 'confirmed'
      };
      const created = await BookingModel.create([bookingDoc], { session });
      const booking = created[0];

      // build arrayFilters and set ops to mark seats booked
      const arrayFilters = seatsRequested.map((sn, idx) => ({ [`s${idx}.seatNumber`]: sn, [`s${idx}.isAvailable`]: true }));
      const setOps = {};
      seatsRequested.forEach((sn, idx) => {
        setOps[`seats.$[s${idx}].isAvailable`] = false;
        setOps[`seats.$[s${idx}].bookingId`] = booking._id;
      });

      const updateRes = await Trip.updateOne(
        { _id: freshTrip._id, availableSeats: { $gte: seatsRequested.length }, status: 'scheduled' },
        { $inc: { availableSeats: -seatsRequested.length, bookingsCount: seatsRequested.length }, $set: setOps },
        { arrayFilters, session }
      );

      if (updateRes.modifiedCount !== 1) {
        await session.abortTransaction(); session.endSession();
        res.status(500); throw new Error('Failed to reserve seats (concurrency conflict)');
      }

      await session.commitTransaction();
      session.endSession();

      return res.status(201).json({ message: 'Booking confirmed', booking, seats: seatsRequested });
    } catch (err) {
      try { await session.abortTransaction(); } catch (e) {}
      session.endSession();
      throw err;
    }
  }

  // Fallback (no transactions) — try conditional update with arrayFilters, then create booking
  const tmpBookingId = mongoose.Types.ObjectId();
  const arrayFiltersFallback = seatsRequested.map((sn, idx) => ({ [`s${idx}.seatNumber`]: sn, [`s${idx}.isAvailable`]: true }));
  const setOpsFallback = {};
  seatsRequested.forEach((sn, idx) => {
    setOpsFallback[`seats.$[s${idx}].isAvailable`] = false;
    setOpsFallback[`seats.$[s${idx}].bookingId`] = tmpBookingId;
  });

  const updateResFallback = await Trip.updateOne(
    { _id: trip._id, availableSeats: { $gte: seatsRequested.length }, status: 'scheduled' },
    { $inc: { availableSeats: -seatsRequested.length, bookingsCount: seatsRequested.length }, $set: setOpsFallback },
    { arrayFilters: arrayFiltersFallback }
  );
  if (updateResFallback.modifiedCount !== 1) {
    res.status(409); throw new Error('Failed to reserve seats (concurrency conflict or seats unavailable)');
  }

  // create booking record with same id
  const bookingFallback = await Booking.create({
    _id: tmpBookingId,
    company: trip.company,
    trip: trip._id,
    vehicle: trip.vehicle,
    seatNumbers: seatsRequested,
    seats: seatsRequested.length,
    pricePerSeat: trip.pricePerSeat,
    totalAmount: seatsRequested.length * trip.pricePerSeat,
    customer: { name: customer.name, phone: customer.phone, email: customer.email || '' },
    paymentMethod,
    paymentStatus: 'pending',
    reference: bookingRef,
    status: 'confirmed'
  });

  return res.status(201).json({ message: 'Booking confirmed', booking: bookingFallback, seats: seatsRequested });
});
