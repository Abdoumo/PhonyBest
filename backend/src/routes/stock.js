const router = require('express').Router();
const { getStockOverview } = require('../controllers/stockController');
const { authenticate, authorize } = require('../middleware/auth');

// Available to ADMIN and SUPER_GRO
router.get('/', authenticate, authorize('ADMIN', 'SUPER_GRO'), getStockOverview);

module.exports = router;
