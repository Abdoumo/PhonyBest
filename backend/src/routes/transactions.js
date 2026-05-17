const express = require('express');
const router = express.Router();
const { getTransactions } = require('../controllers/transactionsController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', getTransactions);

module.exports = router;
