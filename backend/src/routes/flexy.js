const router = require('express').Router();
const { sendFlexy, getFlexyHistory, bulkFlexy, getModemStatus } = require('../controllers/flexyController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/send', sendFlexy);
router.get('/history', getFlexyHistory);
router.post('/bulk', bulkFlexy);

router.get('/modem-status', getModemStatus);

module.exports = router;
