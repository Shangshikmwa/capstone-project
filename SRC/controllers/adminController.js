import Company from '../models/companyModel.js';
import Vehicle from '../models/vehicleModel.js';

export const getAllCompany = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 20, 1);
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();
    const active = req.query.active;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (typeof active !== 'undefined') {
      query.active = active === 'true';
    }

    const [companies, totalCompanies] = await Promise.all([
      Company.find(query)
        .select('-password -__v -passwordResetToken -passwordResetExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Company.countDocuments(query)
    ]);

    return res.json({
      success: true,
      results: companies.length,
      page,
      limit,
      totalPages: Math.ceil(totalCompanies / limit) || 0,
      totalCompanies,
      data: companies
    });
  } catch (err) {
    console.error('getAllCompany error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getAllVehicles = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 20, 1);
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();
    const { companyId, isAvailable, route, terminal, includeDeleted } = req.query;

    const query = {};

    if (!includeDeleted || includeDeleted === 'false') {
      query.isDeleted = false;
    }

    if (companyId) {
      query.company = companyId;
    }

    if (typeof isAvailable !== 'undefined') {
      query.isAvailable = isAvailable === 'true';
    }

    if (route) {
      query.route = { $regex: route, $options: 'i' };
    }

    if (terminal) {
      query.terminal = { $regex: terminal, $options: 'i' };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { registrationNumber: { $regex: search, $options: 'i' } },
        { route: { $regex: search, $options: 'i' } },
        { terminal: { $regex: search, $options: 'i' } }
      ];
    }

    const [vehicles, totalVehicles] = await Promise.all([
      Vehicle.find(query)
        .populate('company', 'companyName name email phoneNumber role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Vehicle.countDocuments(query)
    ]);

    return res.json({
      success: true,
      results: vehicles.length,
      page,
      limit,
      totalPages: Math.ceil(totalVehicles / limit) || 0,
      totalVehicles,
      data: vehicles
    });
  } catch (err) {
    console.error('getAllVehicles error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

