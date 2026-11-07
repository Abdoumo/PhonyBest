const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { getAds, getAllAds, createAd, updateAd, updateAdStatus, deleteAd } = require('../controllers/adsController');
const { authenticate, authorize } = require('../middleware/auth');

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `ad_${Date.now()}_${Math.round(Math.random() * 1E6)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext) && ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('الملفات المسموح بها فقط هي صور من نوع JPG أو PNG أو WEBP بحجم أقصاه 2 ميغابايت'));
    }
  }
});

router.get('/', getAds);
router.get('/all', authenticate, authorize('ADMIN'), getAllAds);
router.post('/', authenticate, authorize('ADMIN'), upload.single('image'), createAd);
router.put('/:id', authenticate, authorize('ADMIN'), upload.single('image'), updateAd);
router.put('/:id/status', authenticate, authorize('ADMIN'), updateAdStatus);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteAd);

module.exports = router;
