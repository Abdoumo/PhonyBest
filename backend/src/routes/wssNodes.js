/**
 * WSS Nodes Routes
 * Admin-only routes for managing ModemGrid nodes
 */
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const wssController = require('../controllers/wssNodesController');

// All routes require admin authentication
router.use(authenticate, authorize('ADMIN'));

// Nodes CRUD
router.get('/nodes', wssController.getNodes);
router.post('/nodes', wssController.createNode);
router.delete('/nodes/:id', wssController.deleteNode);
router.put('/nodes/:id/regenerate-token', wssController.regenerateToken);

// Node details
router.get('/nodes/:id/dongles', wssController.getNodeDongles);

// Global views
router.get('/dongles', wssController.getAllDongles);
router.get('/pools', wssController.getAllPools);
router.get('/stats', wssController.getStats);
router.get('/queue', wssController.getQueue);
router.get('/events', wssController.getEvents);
router.get('/history', wssController.getHistory);

module.exports = router;
