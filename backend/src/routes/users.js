const router = require('express').Router();
const { getUsers, getUser, createUser, updateUser, deleteUser, manageDebt, uploadLogo } = require('../controllers/usersController');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads/logos directory exists
const uploadDir = path.join(__dirname, '../../uploads/logos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images are allowed'));
  }
});

router.use(authenticate);
router.get('/', getUsers); // All authenticated users can list (controller scopes to parent_id)
router.get('/:id', getUser); // All authenticated users can get specific user (controller scopes to parent_id)
router.post('/me/logo', upload.single('logo'), uploadLogo);
router.post('/', authorize('ADMIN','SUPER_GRO','GRO','GROSIST','COMMERCANT'), createUser);
router.put('/:id', authorize('ADMIN','SUPER_GRO','GRO','GROSIST','COMMERCANT'), updateUser);
router.post('/:id/debt', authorize('ADMIN','SUPER_GRO','GRO','GROSIST','COMMERCANT'), manageDebt);
router.delete('/:id', authorize('ADMIN'), deleteUser);

module.exports = router;
