const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { protect, authorize, can } = require('../middleware/auth');

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

// @desc    Get all comments with filtering
// @route   GET /api/v1/comments
// @access  Private (Editor+)
router.get('/', [
  protect,
  authorize('admin', 'editor'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'spam']).withMessage('Invalid status'),
  query('post').optional().isMongoId().withMessage('Invalid post ID'),
  query('search').optional().isLength({ min: 1 }).withMessage('Search term cannot be empty')
], validateRequest, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      post,
      search
    } = req.query;

    // Build filter object
    const filter = {};

    if (status) filter.status = status;
    if (post) filter.post = post;

    if (search) {
      filter.$or = [
        { 'author.name': { $regex: search, $options: 'i' } },
        { 'author.email': { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const comments = await Comment.find(filter)
      .populate('post', 'title slug')
      .populate('moderatedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Comment.countDocuments(filter);

    res.json({
      success: true,
      count: comments.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: comments
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get comments for a specific post
// @route   GET /api/v1/comments/post/:postId
// @access  Public
router.get('/post/:postId', [
  param('postId').isMongoId().withMessage('Invalid post ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], validateRequest, async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get approved comments only
    const comments = await Comment.find({ post: postId, status: 'approved' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Comment.countDocuments({ post: postId, status: 'approved' });

    res.json({
      success: true,
      count: comments.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: comments
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single comment
// @route   GET /api/v1/comments/:id
// @access  Private (Editor+)
router.get('/:id', [
  protect,
  authorize('admin', 'editor'),
  param('id').isMongoId().withMessage('Invalid comment ID')
], validateRequest, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id)
      .populate('post', 'title slug')
      .populate('moderatedBy', 'firstName lastName');

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    res.json({
      success: true,
      data: comment
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new comment
// @route   POST /api/v1/comments
// @access  Public
router.post('/', [
  body('post').isMongoId().withMessage('Post ID is required'),
  body('author.name').trim().isLength({ min: 1, max: 100 }).withMessage('Author name is required and must be less than 100 characters'),
  body('author.email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('author.website').optional().isURL().withMessage('Website must be a valid URL'),
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment content is required and must be less than 1000 characters'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
], validateRequest, async (req, res, next) => {
  try {
    const { post, author, content, rating } = req.body;

    // Check if post exists
    const postExists = await Post.findById(post);
    if (!postExists) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Create comment
    const comment = await Comment.create({
      post,
      author,
      content,
      rating,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await comment.populate('post', 'title slug');

    res.status(201).json({
      success: true,
      message: 'Comment submitted successfully. It will be reviewed before being published.',
      data: comment
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update comment status
// @route   PATCH /api/v1/comments/:id/status
// @access  Private (Editor+)
router.patch('/:id/status', [
  protect,
  authorize('admin', 'editor'),
  param('id').isMongoId().withMessage('Invalid comment ID'),
  body('status').isIn(['pending', 'approved', 'rejected', 'spam']).withMessage('Invalid status')
], validateRequest, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    comment.status = status;
    comment.moderatedBy = req.user._id;
    comment.moderatedAt = new Date();

    await comment.save();

    await comment.populate('moderatedBy', 'firstName lastName');

    res.json({
      success: true,
      message: `Comment ${status} successfully`,
      data: comment
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete comment
// @route   DELETE /api/v1/comments/:id
// @access  Private (Admin only)
router.delete('/:id', [
  protect,
  can('comment:delete'),
  param('id').isMongoId().withMessage('Invalid comment ID')
], validateRequest, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    await Comment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Bulk update comments
// @route   PATCH /api/v1/comments/bulk
// @access  Private (Editor+)
router.patch('/bulk', [
  protect,
  authorize('admin', 'editor'),
  body('commentIds').isArray({ min: 1 }).withMessage('Comment IDs must be an array'),
  body('action').isIn(['approve', 'reject', 'spam', 'delete']).withMessage('Invalid action')
], validateRequest, async (req, res, next) => {
  try {
    const { commentIds, action } = req.body;
    let success = 0;
    let failed = 0;

    for (const commentId of commentIds) {
      try {
        if (action === 'delete') {
          await Comment.findByIdAndDelete(commentId);
        } else {
          const status = action === 'approve' ? 'approved' : action;
          await Comment.findByIdAndUpdate(commentId, {
            status,
            moderatedBy: req.user._id,
            moderatedAt: new Date()
          });
        }
        success++;
      } catch (error) {
        failed++;
      }
    }

    res.json({
      success: true,
      message: `Bulk operation completed. ${success} successful, ${failed} failed.`,
      results: { success, failed }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
