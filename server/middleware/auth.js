// middleware/auth.js
// Protects routes — every protected endpoint runs this first.
// It reads the JWT from the Authorization header, verifies it,
// and attaches the decoded user payload to req.user.

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  // Expect:  Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role, initials }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

// Extra guard: only admin users can access certain routes
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
