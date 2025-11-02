export const restrictTo = (...allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) return res.status(401).json({ success: false, error: 'You are not authenticated' });
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ success: false, error: 'You are not authorized to access this' });
      }
      next();
    };
  };