import jwt from 'jsonwebtoken';
import User from '../models/user.models.js';

export const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('+active +role');
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    if (!user.active) {
      return res.status(403).json({ success: false, error: 'Account not active' });
    }

    req.user = user; 
  } catch (err) {
    console.error('protect error:', err);
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};