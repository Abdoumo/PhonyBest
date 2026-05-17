const router = require('express').Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getSettings);
router.post('/', authorize('ADMIN'), updateSettings);

module.exports = router;
