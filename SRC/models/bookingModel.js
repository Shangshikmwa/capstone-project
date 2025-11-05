import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },

  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // if authenticated
  seatNumbers: { type: [String], required: true }, // e.g. ["1A","1B"]
  seats: { type: Number, required: true, min: 1 },

  pricePerSeat: { type: Number, required: true, min: 0 }, 
  totalAmount: { type: Number, required: true, min: 0 }, 

  customer: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: '' }
  },

  paymentMethod: { type: String, default: 'unpaid' },
  paymentStatus: { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending' },

  reference: { type: String, required: true, unique: true }, 
  status: { type: String, enum: ['pending','confirmed','cancelled'], default: 'confirmed', index: true },

  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }

}, { timestamps: true });

const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
export default Booking;
