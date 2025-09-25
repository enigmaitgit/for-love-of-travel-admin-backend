const Post = require('../models/Post');
const ContentPage = require('../models/ContentPage');
const { validationResult } = require('express-validator');

// @desc    Get published content page
// @route   GET /api/content-page
// @access  Public
const getPublicContentPage = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
    }

    const contentPage = await ContentPage.findPublished();

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

// @desc    Get public post by slug
// @route   GET /api/posts/:slug
// @access  Public
const getPublicPostBySlug = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid slug format'
      });
    }

    const post = await Post.findOne({ 
      slug: req.params.slug, 
      status: 'published' 
    })
      .populate('author', 'firstName lastName email avatar bio')
      .populate('categories', 'name slug color')
      .lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Increment view count
    await Post.findByIdAndUpdate(post._id, { $inc: { 'stats.views': 1 } });
    post.stats.views += 1;

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicContentPage,
  getPublicPostBySlug
};
