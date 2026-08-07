const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

/**
 * Generate JWT tokens
 */
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
  const refreshToken = jwt.sign(
    { userId, role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

/**
 * POST /api/v1/auth/login
 */
const login = async (req, res) => {
  try {
    const { username, password, usb_session_id } = req.body;

    const result = await query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is ' + user.status });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokens = generateTokens(user.id, user.role);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokens.refreshToken, expiresAt]
    );

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    // Log session
    await query(
      'INSERT INTO session_logs (user_id, ip_address, user_agent, action) VALUES ($1, $2, $3, $4)',
      [user.id, req.ip, req.headers['user-agent'], 'login']
    );

    // Check if user requires USB auth (has an active key)
    const usbKeyResult = await query(
      "SELECT id FROM usb_auth_keys WHERE user_id = $1 AND status = 'active'",
      [user.id]
    );
    const usbAuthRequired = usbKeyResult.rows.length > 0;

    if (usbAuthRequired) {
      // Check if this user has any active USB session
      const activeSessionResult = await query(`
        SELECT session_id
        FROM usb_sessions
        WHERE user_id = $1
          AND status = 'active'
          AND last_heartbeat >= NOW() - INTERVAL '15 seconds'
        ORDER BY last_heartbeat DESC LIMIT 1
      `, [user.id]);

      let sessionIdToUse = usb_session_id;

      if (!sessionIdToUse && activeSessionResult.rows.length > 0) {
        sessionIdToUse = activeSessionResult.rows[0].session_id;
      }

      if (!sessionIdToUse) {
        return res.status(401).json({ error: 'USB Hardware Key Required or Session Expired', code: 'USB_AUTH_REQUIRED' });
      }

      // Issue HttpOnly Cookie
      res.cookie('usb_session_token', sessionIdToUse, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days (will still expire via heartbeat in DB)
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        wallet: parseFloat(user.wallet),
        debt: parseFloat(user.debt),
        logo_url: user.logo_url
      },
      ...tokens,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * POST /api/v1/auth/refresh
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    // Verify token exists in DB
    const result = await query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
      [token, decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Delete old token
    await query('DELETE FROM refresh_tokens WHERE token = $1', [token]);

    // Generate new tokens
    const tokens = generateTokens(decoded.userId, decoded.role);

    // Store new refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [decoded.userId, tokens.refreshToken, expiresAt]
    );

    res.json({ success: true, ...tokens });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

/**
 * POST /api/v1/auth/logout
 */
const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (token) {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
    }

    if (req.user) {
      await query(
        'INSERT INTO session_logs (user_id, ip_address, user_agent, action) VALUES ($1, $2, $3, $4)',
        [req.user.id, req.ip, req.headers['user-agent'], 'logout']
      );
    }

    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET /api/v1/auth/me
 */
const getMe = async (req, res) => {
  try {
    const user = { ...req.user };
    
    // We intentionally DO NOT send usb_auth_required to the frontend anymore.
    // The login endpoint handles USB auth verification automatically.

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { login, refreshToken, logout, getMe };
