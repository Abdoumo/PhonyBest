const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
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
} = require('../controllers/usbAuthController');

// ═══════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS (called by Python client, no JWT needed)
// ═══════════════════════════════════════════════════════════

// Verify USB device + auth file → create session
router.post('/verify', verifyUsb);

// Keep session alive (Python heartbeat loop)
router.post('/heartbeat', heartbeat);

// Terminate session (USB removed)
router.post('/logout', usbLogout);

// Check session status (browser polling)
router.get('/session-status', sessionStatus);

// ═══════════════════════════════════════════════════════════
// SELF-SERVICE (any authenticated user, for their own profile)
// ═══════════════════════════════════════════════════════════

// Generate security.auth for the currently logged-in user
router.post('/generate-my-key', authenticate, generateMyKey);

// Get own key info
router.get('/my-key', authenticate, getMyKey);

// Get own session history
router.get('/my-session', authenticate, getMySession);

// Reset own USB serial
router.post('/reset-my-serial', authenticate, resetMySerial);

// Revoke own USB key
router.post('/revoke-my-key', authenticate, revokeMyKey);

// ═══════════════════════════════════════════════════════════
// ADMIN ENDPOINTS (require JWT + ADMIN role)
// ═══════════════════════════════════════════════════════════

// Generate security.auth content for any user
router.post('/generate-key', authenticate, authorize('ADMIN'), generateSecurityKey);

// Download security.auth file for a user
router.get('/download-key/:userId', authenticate, authorize('ADMIN'), downloadSecurityKey);

// List all USB auth keys
router.get('/keys', authenticate, authorize('ADMIN'), listKeys);

// Revoke a USB key
router.post('/revoke', authenticate, authorize('ADMIN'), revokeKey);

// Reset USB serial binding
router.post('/reset-serial', authenticate, authorize('ADMIN'), resetSerial);

// List all sessions
router.get('/sessions', authenticate, authorize('ADMIN'), listSessions);

module.exports = router;
