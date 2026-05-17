const router = require('express').Router();
const { addBalance, removeBalance, transfer, getHistory } = require('../controllers/walletController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/history', getHistory);
router.post('/add', authorize('ADMIN','SUPER_GRO'), addBalance);
router.post('/remove', authorize('ADMIN','SUPER_GRO'), removeBalance);
router.post('/transfer', transfer);

module.exports = router;
