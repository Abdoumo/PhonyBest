const router = require('express').Router();
const {
  sendFlexy,
  getFlexyHistory,
  bulkFlexy,
  getOnlineModems,
  getFlexyGrosDetails,
  checkSimOffersHandler
} = require('../controllers/flexyController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/send', sendFlexy);
router.get('/history', getFlexyHistory);
router.post('/bulk', bulkFlexy);
router.get('/modems', getOnlineModems);
router.get('/gros-details', getFlexyGrosDetails);
router.get('/sim-offers', checkSimOffersHandler);
router.post('/sim-offers', checkSimOffersHandler);

module.exports = router;
