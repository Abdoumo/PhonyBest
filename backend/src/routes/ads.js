const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { getAds, getAllAds, createAd, updateAd, updateAdStatus, deleteAd } = require('../controllers/adsController');
const { authenticate, authorize } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `ad_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

router.get('/', getAds);
router.get('/all', authenticate, authorize('ADMIN'), getAllAds);
router.post('/', authenticate, authorize('ADMIN'), upload.single('image'), createAd);
router.put('/:id', authenticate, authorize('ADMIN'), upload.single('image'), updateAd);
router.put('/:id/status', authenticate, authorize('ADMIN'), updateAdStatus);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteAd);

module.exports = router;
