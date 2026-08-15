const router = require('express').Router();
const { getOfferMappings, createOfferMapping, updateOfferMapping, deleteOfferMapping } = require('../controllers/offerMappingsController');
const { authenticate, authorize } = require('../middleware/auth');

// Protect all routes with admin authorization
router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/', getOfferMappings);
router.post('/', createOfferMapping);
router.put('/:id', updateOfferMapping);
router.delete('/:id', deleteOfferMapping);

module.exports = router;
