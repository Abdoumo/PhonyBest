const crypto = require('crypto');
const { query } = require('../config/database');

const USB_ENCRYPTION_KEY = process.env.USB_ENCRYPTION_KEY || 'flexy_usb_encryption_key_2026';

// Session timeout: if no heartbeat in 15 seconds, session is considered dead
const SESSION_TIMEOUT_MS = 15000;

/**
 * Generate a security.auth file content for a user
 * POST /api/v1/usb-auth/generate-key
 * Body: { user_id } (admin only)
 */
const generateSecurityKey = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Verify the target user exists
    const userResult = await query('SELECT id, username, role FROM users WHERE id = $1', [user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Generate a secure auth token
    const authToken = crypto.randomBytes(48).toString('hex');

    // Create HMAC signature
    const hmac = crypto.createHmac('sha256', USB_ENCRYPTION_KEY);
    hmac.update(`${user.id}:${authToken}`);
    const signature = hmac.digest('hex');

    // Store the token hash in the database (never store raw tokens)
    const tokenHash = crypto.createHash('sha256').update(authToken).digest('hex');

    // Upsert the usb_auth_keys table
    await query(`
      INSERT INTO usb_auth_keys (user_id, token_hash, status, created_at, updated_at)
      VALUES ($1, $2, 'active', NOW(), NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET token_hash = $2, status = 'active', updated_at = NOW()
    `, [user.id, tokenHash]);

    // Build the security.auth file content
    const authFileContent = JSON.stringify({
      version: '1.0',
      user_id: user.id,
      username: user.username,
      auth_token: authToken,
      signature: signature,
      issued_at: new Date().toISOString(),
      issuer: 'FlexyGSM-USB-Auth',
    }, null, 2);

    res.json({
      success: true,
      message: 'Security key generated successfully',
      file_content: authFileContent,
      filename: 'security.auth',
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error('Generate security key error:', err);
    res.status(500).json({ error: 'Failed to generate security key' });
  }
};

/**
 * Generate a security.auth file for the currently logged-in user (self)
 * POST /api/v1/usb-auth/generate-my-key
 * Any authenticated user can call this for their own profile
 */
const generateMyKey = async (req, res) => {
  try {
    const user = req.user;

    // Generate a secure auth token
    const authToken = crypto.randomBytes(48).toString('hex');

    // Create HMAC signature
    const hmac = crypto.createHmac('sha256', USB_ENCRYPTION_KEY);
    hmac.update(`${user.id}:${authToken}`);
    const signature = hmac.digest('hex');

    // Store the token hash in the database (never store raw tokens)
    const tokenHash = crypto.createHash('sha256').update(authToken).digest('hex');

    // Upsert the usb_auth_keys table
    await query(`
      INSERT INTO usb_auth_keys (user_id, token_hash, status, created_at, updated_at)
      VALUES ($1, $2, 'active', NOW(), NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET token_hash = $2, status = 'active', updated_at = NOW()
    `, [user.id, tokenHash]);

    // Build the security.auth file content
    const authFileContent = JSON.stringify({
      version: '1.0',
      user_id: user.id,
      username: user.username,
      auth_token: authToken,
      signature: signature,
      issued_at: new Date().toISOString(),
      issuer: 'FlexyGSM-USB-Auth',
    }, null, 2);

    res.json({
      success: true,
      message: 'Security key generated successfully',
      file_content: authFileContent,
      filename: 'security.auth',
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error('Generate my key error:', err);
    res.status(500).json({ error: 'Failed to generate security key' });
  }
};

/**
 * Get the current user's own key info
 * GET /api/v1/usb-auth/my-key
 */
const getMyKey = async (req, res) => {
  try {
    const user = req.user;

    const result = await query(`
      SELECT k.id, k.user_id, k.usb_serial, k.status, k.created_at, k.updated_at
      FROM usb_auth_keys k
      WHERE k.user_id = $1
    `, [user.id]);

    if (result.rows.length === 0) {
      return res.json({ success: true, key: null });
    }

    res.json({ success: true, key: result.rows[0] });
  } catch (err) {
    console.error('Get my key error:', err);
    res.status(500).json({ error: 'Failed to get key info' });
  }
};

/**
 * Get the current user's active session
 * GET /api/v1/usb-auth/my-session
 */
const getMySession = async (req, res) => {
  try {
    const user = req.user;

    const result = await query(`
      SELECT session_id, usb_serial, status, last_heartbeat, created_at, ended_at
      FROM usb_sessions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [user.id]);

    res.json({ success: true, sessions: result.rows });
  } catch (err) {
    console.error('Get my session error:', err);
    res.status(500).json({ error: 'Failed to get session info' });
  }
};

/**
 * Download security.auth file
 * GET /api/v1/usb-auth/download-key/:userId
 */
const downloadSecurityKey = async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user exists
    const userResult = await query('SELECT id, username, role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Generate a fresh auth token
    const authToken = crypto.randomBytes(48).toString('hex');

    // Create HMAC signature
    const hmac = crypto.createHmac('sha256', USB_ENCRYPTION_KEY);
    hmac.update(`${user.id}:${authToken}`);
    const signature = hmac.digest('hex');

    // Store the token hash
    const tokenHash = crypto.createHash('sha256').update(authToken).digest('hex');

    await query(`
      INSERT INTO usb_auth_keys (user_id, token_hash, status, created_at, updated_at)
      VALUES ($1, $2, 'active', NOW(), NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET token_hash = $2, status = 'active', updated_at = NOW()
    `, [user.id, tokenHash]);

    const authFileContent = JSON.stringify({
      version: '1.0',
      user_id: user.id,
      username: user.username,
      auth_token: authToken,
      signature: signature,
      issued_at: new Date().toISOString(),
      issuer: 'FlexyGSM-USB-Auth',
    }, null, 2);

    // Send as downloadable file
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="security.auth"');
    res.send(authFileContent);
  } catch (err) {
    console.error('Download security key error:', err);
    res.status(500).json({ error: 'Failed to download security key' });
  }
};

/**
 * Verify USB + auth file and create session
 * POST /api/v1/usb-auth/verify
 * Body: { auth_token, user_id, usb_serial, signature }
 */
const verifyUsb = async (req, res) => {
  try {
    const { auth_token, user_id, usb_serial, signature } = req.body;

    if (!auth_token || !user_id || !usb_serial) {
      return res.status(400).json({ error: 'auth_token, user_id, and usb_serial are required' });
    }

    // Verify signature
    const hmac = crypto.createHmac('sha256', USB_ENCRYPTION_KEY);
    hmac.update(`${user_id}:${auth_token}`);
    const expectedSignature = hmac.digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid signature - tampered auth file' });
    }

    // Check the token hash matches
    const tokenHash = crypto.createHash('sha256').update(auth_token).digest('hex');

    const keyResult = await query(
      'SELECT * FROM usb_auth_keys WHERE user_id = $1 AND token_hash = $2 AND status = $3',
      [user_id, tokenHash, 'active']
    );

    if (keyResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or revoked auth token' });
    }

    const authKey = keyResult.rows[0];

    // Check USB serial match - if first time, register it; if already set, verify
    if (authKey.usb_serial && authKey.usb_serial !== usb_serial) {
      return res.status(401).json({ error: 'USB serial mismatch - this key is bound to a different device' });
    }

    // Bind USB serial if first time
    if (!authKey.usb_serial) {
      await query('UPDATE usb_auth_keys SET usb_serial = $1, updated_at = NOW() WHERE id = $2', [usb_serial, authKey.id]);
    }

    // Verify user exists and is active
    const userResult = await query('SELECT id, username, role, status FROM users WHERE id = $1', [user_id]);
    if (userResult.rows.length === 0 || userResult.rows[0].status !== 'active') {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Invalidate any existing sessions for this user
    await query(
      "UPDATE usb_sessions SET status = 'expired', ended_at = NOW() WHERE user_id = $1 AND status = 'active'",
      [user_id]
    );

    // Create new session
    const sessionId = crypto.randomUUID();
    await query(`
      INSERT INTO usb_sessions (session_id, user_id, usb_serial, status, last_heartbeat, created_at)
      VALUES ($1, $2, $3, 'active', NOW(), NOW())
    `, [sessionId, user_id, usb_serial]);

    // Update user's last login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user_id]);

    // Log the USB auth event
    await query(
      "INSERT INTO session_logs (user_id, ip_address, user_agent, action) VALUES ($1, $2, $3, $4)",
      [user_id, req.ip, req.headers['user-agent'] || 'USB-Auth-Client', 'usb_login']
    );

    const user = userResult.rows[0];
    res.json({
      success: true,
      session_id: sessionId,
      user: { id: user.id, username: user.username, role: user.role },
      message: 'USB authentication successful',
    });
  } catch (err) {
    console.error('USB verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
};

/**
 * Heartbeat - keep session alive
 * POST /api/v1/usb-auth/heartbeat
 * Body: { session_id, usb_serial }
 */
const heartbeat = async (req, res) => {
  try {
    const { session_id, usb_serial } = req.body;

    if (!session_id || !usb_serial) {
      return res.status(400).json({ error: 'session_id and usb_serial are required' });
    }

    const result = await query(
      "SELECT * FROM usb_sessions WHERE session_id = $1 AND usb_serial = $2 AND status = 'active'",
      [session_id, usb_serial]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Session not found or expired', active: false });
    }

    // Update heartbeat timestamp
    await query(
      'UPDATE usb_sessions SET last_heartbeat = NOW() WHERE session_id = $1',
      [session_id]
    );

    res.json({ success: true, active: true });
  } catch (err) {
    console.error('Heartbeat error:', err);
    res.status(500).json({ error: 'Heartbeat failed' });
  }
};

/**
 * Logout - terminate session when USB is removed
 * POST /api/v1/usb-auth/logout
 * Body: { session_id }
 */
const usbLogout = async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    const result = await query(
      "UPDATE usb_sessions SET status = 'expired', ended_at = NOW() WHERE session_id = $1 AND status = 'active' RETURNING user_id",
      [session_id]
    );

    if (result.rows.length > 0) {
      // Log the USB logout event
      await query(
        "INSERT INTO session_logs (user_id, ip_address, user_agent, action) VALUES ($1, $2, $3, $4)",
        [result.rows[0].user_id, req.ip, req.headers['user-agent'] || 'USB-Auth-Client', 'usb_logout']
      );
    }

    res.json({ success: true, message: 'Session terminated' });
  } catch (err) {
    console.error('USB logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
};

/**
 * Session status - check if a USB session is active
 * GET /api/v1/usb-auth/session-status?user_id=X
 * Also: GET /api/v1/usb-auth/session-status?session_id=X
 */
const sessionStatus = async (req, res) => {
  try {
    const { user_id, session_id } = req.query;

    if (!user_id && !session_id) {
      return res.status(400).json({ error: 'user_id or session_id is required' });
    }

    let result;
    if (session_id) {
      result = await query(
        "SELECT * FROM usb_sessions WHERE session_id = $1 AND status = 'active'",
        [session_id]
      );
    } else {
      result = await query(
        "SELECT * FROM usb_sessions WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
        [user_id]
      );
    }

    if (result.rows.length === 0) {
      return res.json({ active: false, message: 'No active session' });
    }

    const session = result.rows[0];

    // Check if heartbeat is stale (> SESSION_TIMEOUT_MS)
    const lastHeartbeat = new Date(session.last_heartbeat).getTime();
    const now = Date.now();
    if (now - lastHeartbeat > SESSION_TIMEOUT_MS) {
      // Expire the session
      await query(
        "UPDATE usb_sessions SET status = 'expired', ended_at = NOW() WHERE session_id = $1",
        [session.session_id]
      );
      return res.json({ active: false, message: 'Session expired (heartbeat timeout)' });
    }

    res.json({
      active: true,
      session_id: session.session_id,
      user_id: session.user_id,
      usb_serial: session.usb_serial,
      last_heartbeat: session.last_heartbeat,
      created_at: session.created_at,
    });
  } catch (err) {
    console.error('Session status error:', err);
    res.status(500).json({ error: 'Failed to check session status' });
  }
};

/**
 * List all USB auth keys (admin)
 * GET /api/v1/usb-auth/keys
 */
const listKeys = async (req, res) => {
  try {
    const result = await query(`
      SELECT k.id, k.user_id, u.username, u.full_name, u.role, k.usb_serial, k.status, k.created_at, k.updated_at
      FROM usb_auth_keys k
      JOIN users u ON u.id = k.user_id
      ORDER BY k.created_at DESC
    `);

    res.json({ success: true, keys: result.rows });
  } catch (err) {
    console.error('List keys error:', err);
    res.status(500).json({ error: 'Failed to list keys' });
  }
};

/**
 * Revoke a USB auth key (admin)
 * POST /api/v1/usb-auth/revoke
 * Body: { user_id }
 */
const revokeKey = async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Revoke the key
    await query("UPDATE usb_auth_keys SET status = 'revoked', updated_at = NOW() WHERE user_id = $1", [user_id]);

    // Also kill any active sessions
    await query(
      "UPDATE usb_sessions SET status = 'expired', ended_at = NOW() WHERE user_id = $1 AND status = 'active'",
      [user_id]
    );

    res.json({ success: true, message: 'USB key revoked and sessions terminated' });
  } catch (err) {
    console.error('Revoke key error:', err);
    res.status(500).json({ error: 'Failed to revoke key' });
  }
};

/**
 * Revoke own USB auth key (self-service)
 * POST /api/v1/usb-auth/revoke-my-key
 */
const revokeMyKey = async (req, res) => {
  try {
    const user = req.user;

    // Revoke the key
    await query("UPDATE usb_auth_keys SET status = 'revoked', updated_at = NOW() WHERE user_id = $1", [user.id]);

    // Also kill any active sessions
    await query(
      "UPDATE usb_sessions SET status = 'expired', ended_at = NOW() WHERE user_id = $1 AND status = 'active'",
      [user.id]
    );

    res.json({ success: true, message: 'Your USB security has been disabled' });
  } catch (err) {
    console.error('Revoke my key error:', err);
    res.status(500).json({ error: 'Failed to revoke key' });
  }
};

/**
 * Reset USB serial binding (admin)
 * POST /api/v1/usb-auth/reset-serial
 * Body: { user_id }
 */
const resetSerial = async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    await query("UPDATE usb_auth_keys SET usb_serial = NULL, updated_at = NOW() WHERE user_id = $1", [user_id]);
    await query("UPDATE usb_sessions SET status = 'expired', ended_at = NOW() WHERE user_id = $1 AND status = 'active'", [user_id]);

    res.json({ success: true, message: 'USB serial binding reset' });
  } catch (err) {
    console.error('Reset serial error:', err);
    res.status(500).json({ error: 'Failed to reset serial' });
  }
};

/**
 * Reset own USB serial binding (self-service)
 * POST /api/v1/usb-auth/reset-my-serial
 */
const resetMySerial = async (req, res) => {
  try {
    const user = req.user;
    await query("UPDATE usb_auth_keys SET usb_serial = NULL, updated_at = NOW() WHERE user_id = $1", [user.id]);
    await query("UPDATE usb_sessions SET status = 'expired', ended_at = NOW() WHERE user_id = $1 AND status = 'active'", [user.id]);

    res.json({ success: true, message: 'Your USB serial binding has been reset' });
  } catch (err) {
    console.error('Reset my serial error:', err);
    res.status(500).json({ error: 'Failed to reset serial' });
  }
};

/**
 * List active sessions (admin)
 * GET /api/v1/usb-auth/sessions
 */
const listSessions = async (req, res) => {
  try {
    const result = await query(`
      SELECT s.session_id, s.user_id, u.username, u.full_name, s.usb_serial, s.status, s.last_heartbeat, s.created_at, s.ended_at
      FROM usb_sessions s
      JOIN users u ON u.id = s.user_id
      ORDER BY s.created_at DESC
      LIMIT 100
    `);

    // Also check stale sessions and mark them expired
    const now = Date.now();
    const sessions = result.rows.map(s => {
      if (s.status === 'active') {
        const lastHb = new Date(s.last_heartbeat).getTime();
        if (now - lastHb > SESSION_TIMEOUT_MS) {
          s.status = 'expired (stale)';
        }
      }
      return s;
    });

    res.json({ success: true, sessions });
  } catch (err) {
    console.error('List sessions error:', err);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
};

module.exports = {
  generateSecurityKey,
  generateMyKey,
  getMyKey,
  getMySession,
  downloadSecurityKey,
  verifyUsb,
  heartbeat,
  usbLogout,
  sessionStatus,
  listKeys,
  revokeKey,
  revokeMyKey,
  resetSerial,
  resetMySerial,
  listSessions,
};
