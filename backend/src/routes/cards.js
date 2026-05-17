const router = require('express').Router();
const { uploadCards, getStock, sellCard, markCardUsed, sendSpecificCard, getCardTransactions, buyCards } = require('../controllers/cardsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.post('/upload', authorize('ADMIN','SUPER_GRO'), uploadCards);
router.post('/buy', buyCards);
router.get('/stock', getStock);
router.get('/transactions', authorize('ADMIN','SUPER_GRO'), getCardTransactions);
router.post('/sell', sellCard);
router.post('/:id/send', authorize('ADMIN','SUPER_GRO'), sendSpecificCard);
router.put('/:id/used', authorize('ADMIN', 'SUPER_GRO'), markCardUsed);

module.exports = router;
