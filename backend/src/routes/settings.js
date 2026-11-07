const router = require('express').Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('ADMIN'));
router.get('/', getSettings);
router.post('/', updateSettings);

module.exports = router;
