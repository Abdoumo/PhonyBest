const router = require('express').Router();
const { getConsumption } = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

// Only ADMIN and SUPER_GRO should ideally see global consumption stats
router.get('/consumption', authenticate, authorize('ADMIN', 'SUPER_GRO'), getConsumption);

module.exports = router;
