const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
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

// @desc    Get all posts with filtering and pagination
// @route   GET /api/v1/posts
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['draft', 'review', 'scheduled', 'published', 'archived']).withMessage('Invalid status'),
  query('author').optional().isMongoId().withMessage('Invalid author ID'),
  query('search').optional().isLength({ min: 1 }).withMessage('Search term cannot be empty'),
  query('tags').optional().isString().withMessage('Tags must be a string'),
  query('categories').optional().isString().withMessage('Categories must be a string'),
  query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'publishedAt', 'title', 'views']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
], validateRequest, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      author,
      search,
      tags,
      categories,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    if (status) filter.status = status;
    if (author) filter.author = author;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }

    if (categories) {
      const categoryArray = categories.split(',').map(cat => cat.trim());
      filter.categories = { $in: categoryArray };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const posts = await Post.find(filter)
      .populate('author', 'firstName lastName email avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Post.countDocuments(filter);

    res.json({
      success: true,
      count: posts.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: posts
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single post
// @route   GET /api/v1/posts/:id
// @access  Public
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid post ID')
], validateRequest, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'firstName lastName email avatar bio')
      .lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Increment view count for published posts
    if (post.status === 'published') {
      await Post.findByIdAndUpdate(req.params.id, { $inc: { 'stats.views': 1 } });
      post.stats.views += 1;
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new post
// @route   POST /api/v1/posts
// @access  Private (Contributor+)
router.post('/', [
  protect,
  can('post:create'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('body').trim().isLength({ min: 50 }).withMessage('Body must be at least 50 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('categories').optional().isArray().withMessage('Categories must be an array'),
  body('status').optional().isIn(['draft', 'review', 'scheduled', 'published']).withMessage('Invalid status'),
  body('scheduledAt').optional().isISO8601().withMessage('Invalid scheduled date'),
  body('seo.metaTitle').optional().isLength({ max: 60 }).withMessage('Meta title must be less than 60 characters'),
  body('seo.metaDescription').optional().isLength({ max: 160 }).withMessage('Meta description must be less than 160 characters')
], validateRequest, async (req, res, next) => {
  try {
    const postData = {
      ...req.body,
      author: req.user._id
    };

    // Generate slug from title if not provided
    if (!postData.slug) {
      postData.slug = postData.title
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
    }

    // Check if slug is unique
    const existingPost = await Post.findOne({ slug: postData.slug });
    if (existingPost) {
      postData.slug = `${postData.slug}-${Date.now()}`;
    }

    const post = await Post.create(postData);

    await post.populate('author', 'firstName lastName email avatar');

    res.status(201).json({
      success: true,
      data: post
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update post
// @route   PUT /api/v1/posts/:id
// @access  Private (Contributor+)
router.put('/:id', [
  protect,
  can('post:edit'),
  param('id').isMongoId().withMessage('Invalid post ID'),
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be less than 200 characters'),
  body('body').optional().trim().isLength({ min: 50 }).withMessage('Body must be at least 50 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('categories').optional().isArray().withMessage('Categories must be an array'),
  body('status').optional().isIn(['draft', 'review', 'scheduled', 'published', 'archived']).withMessage('Invalid status'),
  body('scheduledAt').optional().isISO8601().withMessage('Invalid scheduled date')
], validateRequest, async (req, res, next) => {
  try {
    let post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user can edit this post
    if (post.author.toString() !== req.user._id.toString() && !req.user.can('post:edit')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this post'
      });
    }

    // Update slug if title changed
    if (req.body.title && req.body.title !== post.title) {
      const newSlug = req.body.title
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');

      // Check if new slug is unique
      const existingPost = await Post.findOne({ slug: newSlug, _id: { $ne: req.params.id } });
      if (existingPost) {
        req.body.slug = `${newSlug}-${Date.now()}`;
      } else {
        req.body.slug = newSlug;
      }
    }

    post = await Post.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('author', 'firstName lastName email avatar');

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete post
// @route   DELETE /api/v1/posts/:id
// @access  Private (Admin only)
router.delete('/:id', [
  protect,
  can('post:delete'),
  param('id').isMongoId().withMessage('Invalid post ID')
], validateRequest, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    await Post.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Bulk update posts
// @route   PATCH /api/v1/posts/bulk
// @access  Private (Editor+)
router.patch('/bulk', [
  protect,
  can('post:edit'),
  body('postIds').isArray({ min: 1 }).withMessage('Post IDs must be an array'),
  body('action').isIn(['changeStatus', 'delete']).withMessage('Invalid action'),
  body('status').optional().isIn(['draft', 'review', 'scheduled', 'published', 'archived']).withMessage('Invalid status')
], validateRequest, async (req, res, next) => {
  try {
    const { postIds, action, status } = req.body;
    let success = 0;
    let failed = 0;

    for (const postId of postIds) {
      try {
        if (action === 'delete') {
          await Post.findByIdAndDelete(postId);
        } else if (action === 'changeStatus' && status) {
          await Post.findByIdAndUpdate(postId, { status });
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
