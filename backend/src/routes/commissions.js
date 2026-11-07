const router = require('express').Router();
const { getCommissions, setCommission, deleteCommission } = require('../controllers/commissionsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getCommissions);
router.post('/', authorize('ADMIN'), setCommission);
router.delete('/:id', authorize('ADMIN'), deleteCommission);

module.exports = router;
