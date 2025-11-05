// SRC/middleware/protect.js
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';


const getTokenFromRequest = (req) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.split(' ')[1];

  if (req.cookies && req.cookies.jwt) return req.cookies.jwt;

  if (req.query && req.query.token) return req.query.token; // testing only - remove for prod

  return null;
};

export const protect = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authenticated: token missing' });
    }

    if (typeof token !== 'string' || token.split('.').length !== 3) {
      return res.status(401).json({ success: false, error: 'Invalid token format' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error('protect error (jwt.verify):', err && err.message ? err.message : err);
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({ success: false, error: 'Invalid token payload' });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, error: 'User no longer exists' });
    }
    if (user.active === false) {
      return res.status(403).json({ success: false, error: 'Account not active' });
    }

    req.user = user;
    return next();
  } catch (err) {
    console.error('protect middleware unexpected error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

export default protect;
