// controllers/publicTripController.js
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Trip from '../models/tripsModel.js';
import Booking from '../models/bookingModel.js';
import { generateBookingRef } from '../utils/refGenerator.js';
import sendEmail from '../utils/sendEmail.js';

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
    const { 
      seatNumbers = null, 
      seatsCount = null, 
      customer, 
      paymentMethod = 'card', 
      email, 
      returnUrl = `${process.env.FRONTEND_URL}/payment-callback` // Frontend callback URL
    } = req.body || {};
  
    if (!customer || !customer.name || !customer.phone) { 
      res.status(400); 
      throw new Error('Customer name and phone are required'); 
    }
    
    if (!email) {
      res.status(400);
      throw new Error('Email is required for payment');
    }
  
    if (!mongoose.Types.ObjectId.isValid(id)) { 
      res.status(400); 
      throw new Error('Invalid trip id'); 
    }
  
    const trip = await Trip.findOne({ _id: id, isDeleted: false });
    if (!trip) { res.status(404); throw new Error('Trip not found'); }
    if (trip.status !== 'scheduled') { res.status(400); throw new Error('Trip is not schedulable'); }
  
    const toBookCount = Array.isArray(seatNumbers) && seatNumbers.length ? seatNumbers.length : (seatsCount ? Number(seatsCount) : 1);
    if (!Number.isInteger(toBookCount) || toBookCount <= 0) { res.status(400); throw new Error('Invalid seats count'); }
    if (trip.availableSeats < toBookCount) { res.status(409); throw new Error('Not enough seats available'); }
  
    // Seat selection
    let seatsRequested = [];
    if (Array.isArray(seatNumbers) && seatNumbers.length) {
      const uniq = new Set(seatNumbers.map(String));
      if (uniq.size !== seatNumbers.length) { res.status(400); throw new Error('Duplicate seat numbers in request'); }
      seatsRequested = seatNumbers.map(String);
    }
  
    if (!seatsRequested.length) {
      seatsRequested = [];
      for (const s of trip.seats) {
        if (s.isAvailable) seatsRequested.push(s.seatNumber);
        if (seatsRequested.length === toBookCount) break;
      }
      if (seatsRequested.length !== toBookCount) { res.status(409); throw new Error('Not enough available seats to auto-assign'); }
    }
  
    const totalAmount = seatsRequested.length * trip.pricePerSeat;
    const bookingRef = generateBookingRef();
  
    // Create booking with pending status
    const bookingData = {
      company: trip.company,
      trip: trip._id,
      vehicle: trip.vehicle,
      user: req.user ? req.user._id : null,
      seatNumbers: seatsRequested,
      seats: seatsRequested.length,
      pricePerSeat: trip.pricePerSeat,
      totalAmount,
      customer: { 
        name: customer.name, 
        phone: customer.phone, 
        email: email || customer.email || '' 
      },
      paymentMethod,
      paymentStatus: 'pending',
      reference: bookingRef,
      status: 'pending' // Changed to pending until payment is verified
    };
  
    // Initialize Paystack payment
    try {
      const paymentData = await initializePayment(
        email,
        totalAmount,
        bookingRef,
        {
          booking_reference: bookingRef,
          trip_id: trip._id.toString(),
          seats: seatsRequested.join(','),
          customer_name: customer.name,
          customer_phone: customer.phone
        }
      );
  
      // Save booking to database (without reserving seats yet)
      const booking = await Booking.create(bookingData);
  
      res.status(200).json({
        message: 'Payment initialization successful',
        booking: {
          id: booking._id,
          reference: booking.reference,
          totalAmount,
          seats: seatsRequested
        },
        payment: {
          authorizationUrl: paymentData.authorization_url,
          accessCode: paymentData.access_code,
          reference: paymentData.reference
        },
        redirectUrl: returnUrl
      });
  
    } catch (error) {
      res.status(500);
      throw new Error(`Payment initialization failed: ${error.message}`);
    }
  });
  
  //endpoint to verify payment and confirm booking
  export const verifyBookingPayment = asyncHandler(async (req, res) => {
    const { reference } = req.body;
  
    if (!reference) {
      res.status(400);
      throw new Error('Payment reference is required');
    }
  
    try {
      // Verify payment with Paystack
      const payment = await verifyPayment(reference);
  
      if (payment.status !== 'success') {
        res.status(400);
        throw new Error(`Payment failed: ${payment.gateway_response}`);
      }
  
      // Find the pending booking
      const booking = await Booking.findOne({ reference });
      if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
      }
  
      if (booking.status === 'confirmed') {
        return res.json({ 
          message: 'Booking already confirmed', 
          booking,
          payment: { status: 'success' }
        });
      }
  
      const session = await mongoose.startSession();
      try {
        session.startTransaction();
  
        // Get fresh trip data
        const trip = await Trip.findOne({ _id: booking.trip }).session(session);
        if (!trip || trip.status !== 'scheduled') {
          await session.abortTransaction();
          session.endSession();
          res.status(400);
          throw new Error('Trip no longer available');
        }
  
        // Verify seats are still available
        const seatMap = new Map(trip.seats.map(s => [s.seatNumber, s.isAvailable]));
        const unavailableSeats = booking.seatNumbers.filter(sn => !seatMap.has(sn) || seatMap.get(sn) === false);
        
        if (unavailableSeats.length > 0) {
          await session.abortTransaction();
          session.endSession();
          res.status(409);
          throw new Error(`Seats no longer available: ${unavailableSeats.join(', ')}`);
        }
  
        // Reserve seats
        const arrayFilters = booking.seatNumbers.map((sn, idx) => ({
          [`s${idx}.seatNumber`]: sn,
          [`s${idx}.isAvailable`]: true
        }));
  
        const setOps = {};
        booking.seatNumbers.forEach((sn, idx) => {
          setOps[`seats.$[s${idx}].isAvailable`] = false;
          setOps[`seats.$[s${idx}].bookingId`] = booking._id;
        });
  
        const updateResult = await Trip.updateOne(
          { _id: trip._id, availableSeats: { $gte: booking.seats } },
          { 
            $inc: { availableSeats: -booking.seats, bookingsCount: booking.seats },
            $set: setOps
          },
          { arrayFilters, session }
        );
  
        if (updateResult.modifiedCount !== 1) {
          await session.abortTransaction();
          session.endSession();
          res.status(409);
          throw new Error('Failed to reserve seats (concurrency conflict)');
        }
  
        // Update booking status
        booking.paymentStatus = 'paid';
        booking.status = 'confirmed';
        booking.paidAt = new Date();
        booking.paymentDetails = {
          gateway: 'paystack',
          reference: payment.reference,
          channel: payment.channel,
          paidAt: payment.paid_at
        };
  
        await booking.save({ session });
  
        await session.commitTransaction();
        session.endSession();
  
        res.json({
          message: 'Booking confirmed successfully',
          booking,
          payment: {
            status: 'success',
            reference: payment.reference,
            amount: payment.amount / 100, // Convert back from kobo
            paidAt: payment.paid_at
          }
        });
  
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
      }
  
    } catch (error) {
      res.status(500);
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  });
  
  // Webhook endpoint for Paystack (recommended for production)
  export const paymentWebhook = asyncHandler(async (req, res) => {
    const secret = req.headers['x-paystack-signature'];
    const crypto = await import('crypto');
    
    // Verify webhook signature
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    if (hash !== secret) {
      return res.status(400).send('Invalid signature');
    }
  
    const event = req.body;
    
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      
      try {
        // Find and update booking similar to verifyBookingPayment
        const booking = await Booking.findOne({ reference });
        if (booking && booking.status === 'pending') {
          // Process booking confirmation (similar to verifyBookingPayment logic)
          booking.paymentStatus = 'paid';
          booking.status = 'confirmed';
          booking.paidAt = new Date();
          booking.paymentDetails = {
            gateway: 'paystack',
            reference: event.data.reference,
            channel: event.data.channel,
            paidAt: event.data.paid_at
          };
          
          await booking.save();
          
          await sendEmail({
            to: booking.customer.email,
            subject: 'Booking confirmed',
            html: `<p>Your booking has been confirmed.</p>
            <p>Booking reference: ${booking.reference}</p>
            <p>Booking date: ${booking.createdAt.toLocaleDateString()}</p>
            <p>Booking time: ${booking.createdAt.toLocaleTimeString()}</p>
            <p>Booking amount: ${booking.totalAmount}</p>
            <p>Booking seats: ${booking.seatNumbers.join(', ')}</p>
            <p>Booking status: ${booking.status}</p>
            <p>Booking payment status: ${booking.paymentStatus}</p>
            <p>Booking payment reference: ${booking.paymentDetails.reference}</p>   
          `});
        }
      } catch (error) {
        console.error('Webhook processing error:', error);
      }
    }
  
    res.sendStatus(200);
  });
  
