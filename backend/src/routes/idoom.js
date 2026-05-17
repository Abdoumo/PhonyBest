const router = require('express').Router();
const { rechargeIdoom, getIdoomHistory } = require('../controllers/idoomController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/recharge', rechargeIdoom);
router.get('/history', getIdoomHistory);

module.exports = router;
