const router = require('express').Router();
const { getConsumption, getOverview } = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

// Only ADMIN should see platform-wide consumption & business intelligence stats
router.get('/consumption', authenticate, authorize('ADMIN'), getConsumption);
router.get('/overview', authenticate, authorize('ADMIN'), getOverview);

module.exports = router;
