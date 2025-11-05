import mongoose from 'mongoose';

const SeatSubSchema = new mongoose.Schema({
  seatNumber: { type: String, required: true, trim: true },
  isAvailable: { type: Boolean, default: true, index: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
}, { _id: false });

const TripSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },

  departureDate: { type: Date, required: true, index: true },   
  departureTime: { type: String, required: true, trim: true },  

  route: { type: String, required: true, trim: true },
  pricePerSeat: { type: Number, required: true, min: 0 },

  seatCapacity: { type: Number, required: true, min: 1 },
  availableSeats: { type: Number, required: true, min: 0 },
  bookingsCount: { type: Number, default: 0, min: 0 },

  seats: {
    type: [SeatSubSchema],
    default: []
  },

  status: {
    type: String,
    enum: ['draft', 'scheduled', 'cancelled', 'completed'],
    default: 'scheduled',
    index: true
  },

  durationMinutes: { type: Number, default: null },
  arrivalDatetime: { type: Date, default: null },

  inheritedFromVehicleVersion: { type: Number, required: true },

  returnOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', default: null },
  notes: { type: String, trim: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

TripSchema.index({ company: 1, departureDate: 1 });
TripSchema.index({ vehicle: 1, departureDate: 1 });
TripSchema.index({ company: 1, status: 1, departureDate: 1 });

TripSchema.virtual('combinedDeparture').get(function () {
  try {
    const datePart = this.departureDate.toISOString().slice(0, 10);
    const timePart = typeof this.departureTime === 'string' ? this.departureTime : '00:00';
    return new Date(`${datePart}T${timePart}:00.000Z`);
  } catch (err) {
    return null;
  }
});

TripSchema.virtual('computedArrival').get(function () {
  if (this.arrivalDatetime) return this.arrivalDatetime;
  const cd = this.combinedDeparture;
  if (cd && typeof this.durationMinutes === 'number') {
    return new Date(cd.getTime() + (this.durationMinutes * 60 * 1000));
  }
  return null;
});

const Trip = mongoose.models.Trip || mongoose.model('Trip', TripSchema);
export default Trip;
