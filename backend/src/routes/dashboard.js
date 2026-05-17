const router = require('express').Router();
const { getDashboardStats } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/stats', authenticate, getDashboardStats);

module.exports = router;
