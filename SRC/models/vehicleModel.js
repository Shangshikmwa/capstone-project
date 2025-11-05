// models/vehicleModel.js
import mongoose from 'mongoose';

const VehicleSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },

  // static/default vehicle info (canonical)
  name: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  type: { type: String, required: true, trim: true },               
  registrationNumber: { type: String, required: true, trim: true }, 

  // default route/terminal & availability
  terminal: { type: String, required: true, trim: true },           
  route: { type: String, required: true, trim: true },              
  isAvailable: { type: Boolean, default: true, index: true },       

  // seats & default pricing
  seatCapacity: { type: Number, required: true, min: 1 },
  pricePerSeat: { type: Number, required: true, min: 0 },          

  // defaults for departures: vehicle-level default time (e.g. "06:00")
  defaultDepartureTime: { type: String, trim: true, default: '06:00' },

  // soft delete
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },


  // extras & metadata
  features: { type: [String], default: [] },
  images: { type: [{ url: String, publicId: String }], default: [] },
  notes: { type: String, trim: true },

  // versioning for propagation/audit: increment when defaults change
  version: { type: Number, default: 1 },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ensure registrationNumber unique per company
VehicleSchema.index({ company: 1, registrationNumber: 1 }, { unique: true });

// Virtual convenience: cheapestPrice (same as pricePerSeat here)
VehicleSchema.virtual('cheapestPrice').get(function () {
  return this.pricePerSeat;
});

const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);
export default Vehicle;
