import jwt from 'jsonwebtoken';
import Company from '../models/companyModel.js';


const protectCompany = async (req, res, next) => {
  try {
    let token;

    if (req.headers?.authorization?.startsWith?.('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token && req.cookies && req.cookies.companyToken) {
      token = req.cookies.companyToken;
    }

    if (!token) {
      res.status(401);
      return res.status(401).json({ success: false, error: 'Not authorized as a company (no token)' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500);
      return res.status(500).json({ success: false, error: 'Server configuration error: JWT secret missing' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      res.status(401);
      return res.status(401).json({ success: false, error: 'Not authorized as a company (token invalid or expired)' });
    }

    const company = await Company.findById(decoded.id).select('-password -sensitiveFields');
    if (!company) {
      res.status(401);
      return res.status(401).json({ success: false, error: 'Not authorized (company not found)' });
    }

    req.company = company;
    return next();
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

export default protectCompany;