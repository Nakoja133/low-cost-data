const jwt = require('jsonwebtoken');

// ── MAIN AUTH MIDDLEWARE ──────────────────────────────────────
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    res.status(401).json({ error: 'Token is not valid' });
  }
};

// ── ADMIN ONLY MIDDLEWARE ─────────────────────────────────────
// Must be used after auth middleware
auth.isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
  next();
};

// ── AGENT ONLY MIDDLEWARE ─────────────────────────────────────
// Must be used after auth middleware
auth.isAgent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (req.user.role !== 'agent') {
    return res.status(403).json({ error: 'Access denied. Agents only.' });
  }
  next();
};

module.exports = auth;
