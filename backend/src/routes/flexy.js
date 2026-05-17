const router = require('express').Router();
const { sendFlexy, getFlexyHistory, bulkFlexy } = require('../controllers/flexyController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/send', sendFlexy);
router.get('/history', getFlexyHistory);
router.post('/bulk', bulkFlexy);

module.exports = router;
