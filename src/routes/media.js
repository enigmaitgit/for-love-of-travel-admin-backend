const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Media = require('../models/Media');
const { protect, can } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

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
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'application/pdf': 'pdf',
    'text/plain': 'txt'
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
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// @desc    Get all media files
// @route   GET /api/v1/media
// @access  Private (Contributor+)
router.get('/', [
  protect,
  can('media:view'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('type').optional().isIn(['image', 'video', 'document', 'audio']).withMessage('Invalid media type'),
  query('search').optional().isLength({ min: 1 }).withMessage('Search term cannot be empty')
], validateRequest, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      search
    } = req.query;

    // Build filter object
    const filter = {};

    if (type) filter.type = type;

    if (search) {
      filter.$or = [
        { filename: { $regex: search, $options: 'i' } },
        { originalName: { $regex: search, $options: 'i' } },
        { alt: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const media = await Media.find(filter)
      .populate('uploadedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Media.countDocuments(filter);

    res.json({
      success: true,
      count: media.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: media
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single media file
// @route   GET /api/v1/media/:id
// @access  Private (Contributor+)
router.get('/:id', [
  protect,
  can('media:view'),
  param('id').isMongoId().withMessage('Invalid media ID')
], validateRequest, async (req, res, next) => {
  try {
    const media = await Media.findById(req.params.id)
      .populate('uploadedBy', 'firstName lastName email');

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media file not found'
      });
    }

    res.json({
      success: true,
      data: media
    });
  } catch (error) {
    next(error);
  }
});

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
], validateRequest, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { alt, caption, tags = [], isPublic = true } = req.body;

    // Determine file type
    let fileType = 'document';
    if (req.file.mimetype.startsWith('image/')) {
      fileType = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      fileType = 'video';
    } else if (req.file.mimetype.startsWith('audio/')) {
      fileType = 'audio';
    }

    // Create media record
    const media = await Media.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      type: fileType,
      mimeType: req.file.mimetype,
      size: req.file.size,
      alt,
      caption,
      tags,
      uploadedBy: req.user._id,
      isPublic
    });

    await media.populate('uploadedBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: media
    });
  } catch (error) {
    // Clean up uploaded file if database operation fails
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting uploaded file:', err);
      });
    }
    next(error);
  }
});

// @desc    Update media file metadata
// @route   PUT /api/v1/media/:id
// @access  Private (Contributor+)
router.put('/:id', [
  protect,
  can('media:edit'),
  param('id').isMongoId().withMessage('Invalid media ID'),
  body('alt').optional().trim().isLength({ max: 200 }).withMessage('Alt text must be less than 200 characters'),
  body('caption').optional().trim().isLength({ max: 500 }).withMessage('Caption must be less than 500 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean')
], validateRequest, async (req, res, next) => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media file not found'
      });
    }

    // Check if user can edit this media (own upload or admin)
    if (media.uploadedBy.toString() !== req.user._id.toString() && !req.user.can('media:edit')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this media file'
      });
    }

    const updatedMedia = await Media.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('uploadedBy', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Media updated successfully',
      data: updatedMedia
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete media file
// @route   DELETE /api/v1/media/:id
// @access  Private (Admin only)
router.delete('/:id', [
  protect,
  can('media:delete'),
  param('id').isMongoId().withMessage('Invalid media ID')
], validateRequest, async (req, res, next) => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media file not found'
      });
    }

    // Delete physical file
    const filePath = path.join(process.cwd(), media.url);
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    // Delete database record
    await Media.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Media file deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Serve media files
// @route   GET /api/v1/media/serve/:filename
// @access  Public
router.get('/serve/:filename', (req, res, next) => {
  const filename = req.params.filename;
  const filePath = path.join(process.cwd(), 'uploads', filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'File not found'
    });
  }

  // Set appropriate headers
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on('error', (error) => {
    console.error('Error streaming file:', error);
    res.status(500).json({
      success: false,
      message: 'Error serving file'
    });
  });
});

module.exports = router;
