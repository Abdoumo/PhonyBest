const router = require('express').Router();
const { getCommissions, setCommission, deleteCommission } = require('../controllers/commissionsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getCommissions);
router.post('/', authorize('ADMIN','SUPER_GRO'), setCommission);
router.delete('/:id', authorize('ADMIN','SUPER_GRO'), deleteCommission);

module.exports = router;
