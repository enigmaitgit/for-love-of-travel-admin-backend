const Media = require('../models/Media');
const Post = require('../models/Post');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');

// @desc    Get all media files with advanced filtering
// @route   GET /api/v1/media
// @access  Private (Contributor+)
const getMedia = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      search,
      tags,
      uploadedBy,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    if (type) filter.type = type;
    if (uploadedBy) filter.uploadedBy = uploadedBy;

    if (search) {
      filter.$or = [
        { filename: { $regex: search, $options: 'i' } },
        { originalName: { $regex: search, $options: 'i' } },
        { alt: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const media = await Media.find(filter)
      .populate('uploadedBy', 'firstName lastName email avatar')
      .sort(sort)
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
};

// @desc    Get single media file
// @route   GET /api/v1/media/:id
// @access  Private (Contributor+)
const getMediaById = async (req, res, next) => {
  try {
    const media = await Media.findById(req.params.id)
      .populate('uploadedBy', 'firstName lastName email avatar')
      .lean();

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
};

// @desc    Upload media file
// @route   POST /api/v1/media/upload
// @access  Private (Contributor+)
const uploadMedia = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

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

    // Get image dimensions for images
    let dimensions = {};
    if (fileType === 'image') {
      try {
        const sharp = require('sharp');
        const metadata = await sharp(req.file.path).metadata();
        dimensions = {
          width: metadata.width,
          height: metadata.height
        };
      } catch (error) {
        console.warn('Could not get image dimensions:', error.message);
      }
    }

    // Create media record
    const media = await Media.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      type: fileType,
      mimeType: req.file.mimetype,
      size: req.file.size,
      dimensions,
      alt,
      caption,
      tags,
      uploadedBy: req.user._id,
      isPublic
    });

    await media.populate('uploadedBy', 'firstName lastName email avatar');

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
};

// @desc    Update media file metadata
// @route   PUT /api/v1/media/:id
// @route   PATCH /api/v1/media/:id
// @access  Private (Contributor+)
const updateMedia = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

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
    ).populate('uploadedBy', 'firstName lastName email avatar');

    res.json({
      success: true,
      message: 'Media updated successfully',
      data: updatedMedia
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete media file
// @route   DELETE /api/v1/media/:id
// @access  Private (Admin only)
const deleteMedia = async (req, res, next) => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media file not found'
      });
    }

    // Check if media is being used in posts
    const postsUsingMedia = await Post.find({
      $or: [
        { 'featuredImage.url': media.url },
        { 'contentSections.data.imageUrl': media.url },
        { 'contentSections.data.backgroundImage': media.url },
        { 'contentSections.data.images.url': media.url }
      ]
    });

    if (postsUsingMedia.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete media file. It is being used in ${postsUsingMedia.length} post(s).`,
        usedIn: postsUsingMedia.map(post => ({
          id: post._id,
          title: post.title
        }))
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
};

// @desc    Bulk delete media files
// @route   DELETE /api/v1/media/bulk
// @access  Private (Admin only)
const bulkDeleteMedia = async (req, res, next) => {
  try {
    const { mediaIds } = req.body;

    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Media IDs must be provided as an array'
      });
    }

    let success = 0;
    let failed = 0;
    const errors = [];

    for (const mediaId of mediaIds) {
      try {
        const media = await Media.findById(mediaId);
        if (!media) {
          failed++;
          errors.push(`Media ${mediaId} not found`);
          continue;
        }

        // Check if media is being used
        const postsUsingMedia = await Post.find({
          $or: [
            { 'featuredImage.url': media.url },
            { 'contentSections.data.imageUrl': media.url },
            { 'contentSections.data.backgroundImage': media.url },
            { 'contentSections.data.images.url': media.url }
          ]
        });

        if (postsUsingMedia.length > 0) {
          failed++;
          errors.push(`Media ${mediaId} is being used in ${postsUsingMedia.length} post(s)`);
          continue;
        }

        // Delete physical file
        const filePath = path.join(process.cwd(), media.url);
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err) console.error('Error deleting file:', err);
          });
        }

        // Delete database record
        await Media.findByIdAndDelete(mediaId);
        success++;
      } catch (error) {
        failed++;
        errors.push(`Error deleting media ${mediaId}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Bulk delete completed. ${success} successful, ${failed} failed.`,
      results: { success, failed, errors }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get media statistics
// @route   GET /api/v1/media/stats
// @access  Private (Admin+)
const getMediaStats = async (req, res, next) => {
  try {
    const stats = await Media.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      }
    ]);

    const totalMedia = await Media.countDocuments();
    const totalSize = await Media.aggregate([
      { $group: { _id: null, totalSize: { $sum: '$size' } } }
    ]);

    const recentUploads = await Media.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('uploadedBy', 'firstName lastName')
      .select('filename originalName type size createdAt')
      .lean();

    res.json({
      success: true,
      data: {
        total: totalMedia,
        totalSize: totalSize[0]?.totalSize || 0,
        byType: stats,
        recentUploads
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search media files
// @route   GET /api/v1/media/search
// @access  Private (Contributor+)
const searchMedia = async (req, res, next) => {
  try {
    const { q, type, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const filter = {
      $or: [
        { filename: { $regex: q, $options: 'i' } },
        { originalName: { $regex: q, $options: 'i' } },
        { alt: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ]
    };

    if (type) {
      filter.type = type;
    }

    const media = await Media.find(filter)
      .populate('uploadedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('filename originalName url type size dimensions alt caption tags createdAt')
      .lean();

    res.json({
      success: true,
      count: media.length,
      data: media
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Serve media files
// @route   GET /api/v1/media/serve/:filename
// @access  Public
const serveMedia = (req, res, next) => {
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
};

module.exports = {
  getMedia,
  getMediaById,
  uploadMedia,
  updateMedia,
  deleteMedia,
  bulkDeleteMedia,
  getMediaStats,
  searchMedia,
  serveMedia
};

