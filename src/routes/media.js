const express = require('express');
const { body, param, query } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  getMedia,
  getMediaById,
  uploadMedia,
  updateMedia,
  deleteMedia,
  bulkDeleteMedia,
  getMediaStats,
  searchMedia,
  serveMedia
} = require('../controllers/mediaController');
const { protect, can } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  },
  fileFilter: fileFilter
});

// @desc    Get all media files
// @route   GET /api/v1/media
// @access  Private (Contributor+)
router.get('/', [
  protect,
  can('media:view')
], getMedia);

// @desc    Search media files
// @route   GET /api/v1/media/search
// @access  Private (Contributor+)
router.get('/search', [
  protect,
  can('media:view')
], searchMedia);

// @desc    Get media statistics
// @route   GET /api/v1/media/stats
// @access  Private (Admin+)
router.get('/stats', [
  protect,
  can('media:view')
], getMediaStats);

// @desc    Get single media file
// @route   GET /api/v1/media/:id
// @access  Private (Contributor+)
router.get('/:id', [
  protect,
  can('media:view'),
  param('id').isMongoId().withMessage('Invalid media ID')
], getMediaById);

// @desc    Upload media file
// @route   POST /api/v1/media/upload
// @access  Private (Contributor+)
router.post('/upload', [
  protect,
  can('media:upload'),
  upload.single('file'),
  body('alt').optional().trim().isLength({ max: 200 }).withMessage('Alt text must be less than 200 characters'),
  body('caption').optional().trim().isLength({ max: 500 }).withMessage('Caption must be less than 500 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean')
], uploadMedia);

// @desc    Update media file metadata
// @route   PUT /api/v1/media/:id
// @route   PATCH /api/v1/media/:id
// @access  Private (Contributor+)
router.put('/:id', [
  protect,
  can('media:edit'),
  param('id').isMongoId().withMessage('Invalid media ID'),
  body('alt').optional().trim().isLength({ max: 200 }).withMessage('Alt text must be less than 200 characters'),
  body('caption').optional().trim().isLength({ max: 500 }).withMessage('Caption must be less than 500 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean')
], updateMedia);

router.patch('/:id', [
  protect,
  can('media:edit'),
  param('id').isMongoId().withMessage('Invalid media ID'),
  body('alt').optional().trim().isLength({ max: 200 }).withMessage('Alt text must be less than 200 characters'),
  body('caption').optional().trim().isLength({ max: 500 }).withMessage('Caption must be less than 500 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean')
], updateMedia);

// @desc    Delete media file
// @route   DELETE /api/v1/media/:id
// @access  Private (Admin only)
router.delete('/:id', [
  protect,
  can('media:delete'),
  param('id').isMongoId().withMessage('Invalid media ID')
], deleteMedia);

// @desc    Bulk delete media files
// @route   DELETE /api/v1/media/bulk
// @access  Private (Admin only)
router.delete('/bulk', [
  protect,
  can('media:delete'),
  body('mediaIds').isArray({ min: 1 }).withMessage('Media IDs must be an array')
], bulkDeleteMedia);

// @desc    Serve media files
// @route   GET /api/v1/media/serve/:filename
// @access  Public
router.get('/serve/:filename', serveMedia);

module.exports = router;