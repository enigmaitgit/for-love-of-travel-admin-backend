const Post = require('../models/Post');
const Category = require('../models/Category');
const Media = require('../models/Media');
const { validationResult } = require('express-validator');

// @desc    Get all posts with advanced filtering
// @route   GET /api/v1/posts
// @access  Public
const getPosts = async (req, res, next) => {
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
      sortOrder = 'desc',
      includeContentSections = false
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

    // Build populate options
    const populateOptions = [
      { path: 'author', select: 'firstName lastName email avatar' },
      { path: 'categories', select: 'name slug color' }
    ];

    // Execute query
    const posts = await Post.find(filter)
      .populate(populateOptions)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Post.countDocuments(filter);

    // Remove content sections if not requested (for performance)
    if (!includeContentSections) {
      posts.forEach(post => {
        delete post.contentSections;
      });
    }

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
};

// @desc    Get single post with full content
// @route   GET /api/v1/posts/:id
// @access  Public
const getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'firstName lastName email avatar bio')
      .populate('categories', 'name slug color')
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
};

// @desc    Create new post with content sections
// @route   POST /api/v1/posts
// @access  Private (Contributor+)
const createPost = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

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

    // Validate content sections if provided
    if (postData.contentSections && Array.isArray(postData.contentSections)) {
      postData.contentSections = postData.contentSections.map(section => ({
        type: section.type,
        data: section.data || section // Handle both formats
      }));
    }

    // Set default breadcrumb if not provided
    if (!postData.breadcrumb) {
      postData.breadcrumb = {
        enabled: true,
        items: [
          { label: 'Home', href: '/' },
          { label: 'Blog', href: '/blog' }
        ]
      };
    }

    const post = await Post.create(postData);

    await post.populate([
      { path: 'author', select: 'firstName lastName email avatar' },
      { path: 'categories', select: 'name slug color' }
    ]);

    res.status(201).json({
      success: true,
      data: post
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update post with content sections
// @route   PUT /api/v1/posts/:id
// @route   PATCH /api/v1/posts/:id
// @access  Private (Contributor+)
const updatePost = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

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

    // Validate content sections if provided
    if (req.body.contentSections && Array.isArray(req.body.contentSections)) {
      req.body.contentSections = req.body.contentSections.map(section => ({
        type: section.type,
        data: section.data || section
      }));
    }

    post = await Post.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
      { path: 'author', select: 'firstName lastName email avatar' },
      { path: 'categories', select: 'name slug color' }
    ]);

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete post
// @route   DELETE /api/v1/posts/:id
// @access  Private (Admin only)
const deletePost = async (req, res, next) => {
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
};

// @desc    Bulk update posts
// @route   PATCH /api/v1/posts/bulk
// @access  Private (Editor+)
const bulkUpdatePosts = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

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
};

// @desc    Get post statistics
// @route   GET /api/v1/posts/stats
// @access  Private (Admin+)
const getPostStats = async (req, res, next) => {
  try {
    const stats = await Post.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalViews: { $sum: '$stats.views' },
          totalLikes: { $sum: '$stats.likes' },
          totalShares: { $sum: '$stats.shares' }
        }
      }
    ]);

    const totalPosts = await Post.countDocuments();
    const publishedPosts = await Post.countDocuments({ status: 'published' });
    const draftPosts = await Post.countDocuments({ status: 'draft' });

    res.json({
      success: true,
      data: {
        total: totalPosts,
        published: publishedPosts,
        draft: draftPosts,
        byStatus: stats,
        recent: await Post.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('author', 'firstName lastName')
          .select('title status createdAt')
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get popular posts
// @route   GET /api/v1/posts/popular
// @access  Public
const getPopularPosts = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;

    const posts = await Post.find({ status: 'published' })
      .sort({ 'stats.views': -1, 'stats.likes': -1 })
      .limit(parseInt(limit))
      .populate('author', 'firstName lastName avatar')
      .populate('categories', 'name slug color')
      .select('title slug excerpt featuredImage stats readingTime publishedAt')
      .lean();

    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  bulkUpdatePosts,
  getPostStats,
  getPopularPosts
};
