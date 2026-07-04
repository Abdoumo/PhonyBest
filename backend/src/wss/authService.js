/**
 * WSS Authentication Service
 * Validates tokens for ModemGrid node connections
 */
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

/**
 * Validate a token from HTTP upgrade headers or register message
 * Returns the node record if valid, null otherwise
 */
async function validateToken(token) {
  if (!token) return null;

  try {
    // Get all active nodes and check token against stored hashes
    const result = await query('SELECT * FROM wss_nodes');
    for (const node of result.rows) {
      const match = await bcrypt.compare(token, node.token_hash);
      if (match) {
        return node;
      }
    }
    return null;
  } catch (err) {
    console.error('❌ WSS Auth error:', err.message);
    return null;
  }
}

/**
 * Extract Bearer token from HTTP upgrade request headers
 */
function extractTokenFromHeaders(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1];
}

/**
 * Generate a new token and hash for node registration
 */
async function generateNodeToken() {
  const crypto = require('crypto');
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(rawToken, 10);
  return { rawToken, tokenHash };
}

module.exports = { validateToken, extractTokenFromHeaders, generateNodeToken };
