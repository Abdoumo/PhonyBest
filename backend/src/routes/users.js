const router = require('express').Router();
const { getUsers, getUser, createUser, updateUser, deleteUser, manageDebt } = require('../controllers/usersController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', authorize('ADMIN','SUPER_GRO','GRO'), getUsers);
router.get('/:id', authorize('ADMIN','SUPER_GRO','GRO'), getUser);
router.post('/', authorize('ADMIN','SUPER_GRO'), createUser);
router.put('/:id', authorize('ADMIN','SUPER_GRO'), updateUser);
router.post('/:id/debt', authorize('ADMIN','SUPER_GRO'), manageDebt);
router.delete('/:id', authorize('ADMIN'), deleteUser);

module.exports = router;
