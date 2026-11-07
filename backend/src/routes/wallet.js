const router = require('express').Router();
const { addBalance, removeBalance, transfer, selfRecharge, transferProfit, getProfitSummary, getHistory } = require('../controllers/walletController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/history', getHistory);
router.get('/profit-summary', getProfitSummary);
router.post('/add', authorize('ADMIN'), addBalance);
router.post('/remove', authorize('ADMIN'), removeBalance);
router.post('/transfer', transfer);
router.post('/self-recharge', selfRecharge);
router.post('/transfer-profit', transferProfit);

module.exports = router;
