const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getSimOffers,
  createSimOrder,
  getSimOrders,
  getSimOrderById,
  updateSimOrderStatus,
  cancelSimOrder
} = require('../controllers/simOrdersController');

// All endpoints require authentication
router.use(authenticate);

// List available SIM offers (accessible to all authenticated users)
router.get('/offers', getSimOffers);

// List orders: ADMIN sees all, (SUPER_GRO, GRO, GROSIST, COMMERCANT) see their own
router.get('/', authorize('ADMIN', 'SUPER_GRO', 'GRO', 'GROSIST', 'COMMERCANT'), getSimOrders);

// Get single order details
router.get('/:id', authorize('ADMIN', 'SUPER_GRO', 'GRO', 'GROSIST', 'COMMERCANT'), getSimOrderById);

// Place an order: Only COMMERCIALS (COMMERCANT), GRO (GRO, GROSIST), SUPER GRO (SUPER_GRO), and ADMIN
router.post('/', authorize('ADMIN', 'SUPER_GRO', 'GRO', 'GROSIST', 'COMMERCANT'), createSimOrder);

// Admin update status / assign delivery agent to user location
router.put('/:id/status', authorize('ADMIN'), updateSimOrderStatus);

// Cancel order
router.delete('/:id', authorize('ADMIN', 'SUPER_GRO', 'GRO', 'GROSIST', 'COMMERCANT'), cancelSimOrder);

module.exports = router;
