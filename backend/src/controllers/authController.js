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
    const { username, password } = req.body;

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
    res.json({ success: true, user: req.user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { login, refreshToken, logout, getMe };
