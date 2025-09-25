const Post = require('../models/Post');
const ContentPage = require('../models/ContentPage');
const { validationResult } = require('express-validator');
const crypto = require('crypto');

// @desc    Get all posts for admin with filtering and pagination
// @route   GET /api/admin/posts
// @access  Private (Admin+)
const getAdminPosts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const posts = await Post.find(filter)
      .populate('author', 'firstName lastName email')
      .populate('categories', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Post.countDocuments(filter);

    res.json({
      success: true,
      rows: posts,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single post for admin
// @route   GET /api/admin/posts/:id
// @access  Private (Admin+)
const getAdminPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'firstName lastName email')
      .populate('categories', 'name slug')
      .lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new post
// @route   POST /api/admin/posts
// @access  Private (Contributor+)
const createAdminPost = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({
        success: false,
        message: firstError.msg
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
      return res.status(409).json({
        success: false,
        message: 'Slug already exists'
      });
    }

    // Set default status to draft
    if (!postData.status) {
      postData.status = 'draft';
    }

    const post = await Post.create(postData);

    await post.populate([
      { path: 'author', select: 'firstName lastName email' },
      { path: 'categories', select: 'name slug' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Draft saved',
      data: post
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update post status (draft→review/scheduled/published)
// @route   PATCH /api/admin/posts/:id
// @access  Private (Contributor+)
const updateAdminPost = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({
        success: false,
        message: firstError.msg
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

    // Validation for publishing
    if (req.body.status && ['review', 'scheduled', 'published'].includes(req.body.status)) {
      if (!req.body.body || req.body.body.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Body required for publishing'
        });
      }

      if (!req.body.tags || req.body.tags.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Select at least one'
        });
      }

      // Validate scheduled date
      if (req.body.status === 'scheduled') {
        if (!req.body.scheduledAt) {
          return res.status(400).json({
            success: false,
            message: 'Invalid date'
          });
        }
        const scheduledDate = new Date(req.body.scheduledAt);
        if (scheduledDate.getTime() <= Date.now()) {
          return res.status(400).json({
            success: false,
            message: 'Invalid date'
          });
        }
      }
    }

    post = await Post.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
      { path: 'author', select: 'firstName lastName email' },
      { path: 'categories', select: 'name slug' }
    ]);

    // Set appropriate success message
    let message = 'Post updated successfully';
    if (req.body.status === 'review') message = 'Sent for review';
    else if (req.body.status === 'published') message = 'Published';
    else if (req.body.status === 'scheduled') message = 'Scheduled';

    res.json({
      success: true,
      message,
      data: post
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get post preview URL
// @route   GET /api/admin/posts/:id/preview
// @access  Private (Admin+)
const getPostPreview = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Generate signed preview URL (simplified for testing)
    const timestamp = Date.now();
    const secret = process.env.PREVIEW_SECRET || 'preview-secret';
    const hash = crypto
      .createHmac('sha256', secret)
      .update(`${req.params.id}-${timestamp}`)
      .digest('hex');

    const previewUrl = `/preview/${req.params.id}?t=${timestamp}&h=${hash}`;

    res.json({
      success: true,
      previewUrl
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get content page
// @route   GET /api/admin/content-page
// @access  Private (Admin+)
const getContentPage = async (req, res, next) => {
  try {
    const contentPage = await ContentPage.findOne({ slug: 'content' });

    if (!contentPage) {
      return res.status(404).json({
        success: false,
        message: 'Content page not found'
      });
    }

    res.json({
      success: true,
      data: contentPage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save content page sections (draft ok)
// @route   POST /api/admin/content-page
// @access  Private (Editor+)
const saveContentPage = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({
        success: false,
        message: firstError.msg
      });
    }

    const { sections, seo } = req.body;

    // Validate sections
    for (const section of sections) {
      if (section.type === 'imageGallery' && (!section.props.images || section.props.images.length === 0)) {
        return res.status(400).json({
          success: false,
          message: 'Gallery must have at least one image'
        });
      }
    }

    const contentPageData = {
      slug: 'content',
      status: 'draft',
      sections,
      seo,
      version: 1
    };

    let contentPage = await ContentPage.findOneAndUpdate(
      { slug: 'content' },
      contentPageData,
      { upsert: true, new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Content page saved',
      data: contentPage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Publish content page sections
// @route   PATCH /api/admin/content-page/publish
// @access  Private (Editor+)
const publishContentPage = async (req, res, next) => {
  try {
    const contentPage = await ContentPage.findOne({ slug: 'content' });

    if (!contentPage) {
      return res.status(404).json({
        success: false,
        message: 'Content page not found'
      });
    }

    // Create published snapshot
    const publishedData = {
      ...contentPage.toObject(),
      status: 'published',
      publishedAt: new Date().toISOString(),
      version: (contentPage.version || 0) + 1
    };

    await ContentPage.findOneAndUpdate(
      { slug: 'content' },
      publishedData,
      { new: true, runValidators: true }
    );

    // Trigger revalidation webhook if configured
    if (process.env.REVALIDATE_WEBHOOK_URL) {
      try {
        const response = await fetch(process.env.REVALIDATE_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Revalidate-Secret': process.env.REVALIDATE_SECRET || 'revalidate-secret'
          },
          body: JSON.stringify({ path: '/content-page' })
        });
      } catch (webhookError) {
        console.error('Revalidation webhook failed:', webhookError);
      }
    }

    res.json({
      success: true,
      message: 'Content page published',
      data: publishedData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminPosts,
  getAdminPost,
  createAdminPost,
  updateAdminPost,
  getPostPreview,
  getContentPage,
  saveContentPage,
  publishContentPage
};
