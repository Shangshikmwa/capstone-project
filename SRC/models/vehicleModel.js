import mongoose from 'mongoose';

const VehicleSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  name: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  type: { type: String, required: true, trim: true },               
  registrationNumber: { type: String, required: true, trim: true }, 
  terminal: { type: String, required: true, trim: true },           
  route: { type: String, required: true, trim: true },              
  isAvailable: { type: Boolean, default: true, index: true },       
  seatCapacity: { type: Number, required: true, min: 1 },
  pricePerSeat: { type: Number, required: true, min: 0 },          
  defaultDepartureTime: { type: String, trim: true, default: '06:00' },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  features: { type: [String], default: [] },
  images: { type: [{ url: String, publicId: String }], default: [] },
  notes: { type: String, trim: true },
  version: { type: Number, default: 1 },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

VehicleSchema.index({ company: 1, registrationNumber: 1 }, { unique: true });

VehicleSchema.virtual('cheapestPrice').get(function () {
  return this.pricePerSeat;
});

const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);
export default Vehicle;
