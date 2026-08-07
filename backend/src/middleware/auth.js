const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

/**
 * JWT Authentication Middleware
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query('SELECT id, username, email, full_name, role, wallet, debt, status, logo_url FROM users WHERE id = $1', [decoded.userId]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account suspended or blocked' });
    }

    // --- USB Hardware Auth Enforcement ---
    const usbKeyRes = await query("SELECT id FROM usb_auth_keys WHERE user_id = $1 AND status = 'active'", [user.id]);
    if (usbKeyRes.rows.length > 0) {
      // User requires USB auth
      
      // Simply check if the user has an active session right now
      const sessionRes = await query(`
        SELECT session_id
        FROM usb_sessions
        WHERE user_id = $1
          AND status = 'active'
          AND last_heartbeat >= NOW() - INTERVAL '15 seconds'
        LIMIT 1
      `, [user.id]);
      
      let hasValidUsbSession = sessionRes.rows.length > 0;

      if (!hasValidUsbSession) {
        // Allow specific routes to bypass USB check so the frontend can still render the "Please Insert USB" screen gracefully
        const allowedPaths = ['/me', '/logout', '/session-status', '/link-session'];
        const isAllowed = allowedPaths.some(p => req.originalUrl.includes(p));
        
        if (!isAllowed) {
          return res.status(403).json({ error: 'USB Hardware Key Required', code: 'USB_AUTH_REQUIRED' });
        }
      }
    }
    // -------------------------------------

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Role-based access control middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
