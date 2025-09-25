const express = require('express');
const { body, param, query } = require('express-validator');
const {
  getAdminPosts,
  getAdminPost,
  createAdminPost,
  updateAdminPost,
  getPostPreview,
  getContentPage,
  saveContentPage,
  publishContentPage
} = require('../controllers/adminController');
const { protect, can } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all posts for admin with filtering and pagination
// @route   GET /api/admin/posts
// @access  Private (Admin+)
router.get('/posts', [
  protect,
  can('post:view')
], getAdminPosts);

// @desc    Get single post for admin
// @route   GET /api/admin/posts/:id
// @access  Private (Admin+)
router.get('/posts/:id', [
  protect,
  can('post:view'),
  param('id').isMongoId().withMessage('Invalid post ID')
], getAdminPost);

// @desc    Create new post
// @route   POST /api/admin/posts
// @access  Private (Contributor+)
router.post('/posts', [
  protect,
  can('post:create'),
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('slug').optional().matches(/^[a-z0-9-]+$/).withMessage('Slug must be URL-safe'),
  body('body').optional().isString(),
  body('tags').optional().isArray(),
  body('categories').optional().isArray(),
  body('featuredImage').optional().isURL().withMessage('Featured image must be a valid URL'),
  body('status').optional().isIn(['draft', 'review', 'scheduled', 'published']).withMessage('Invalid status'),
  body('scheduledAt').optional().isISO8601().withMessage('Invalid scheduled date')
], createAdminPost);

// @desc    Update post status (draft→review/scheduled/published)
// @route   PATCH /api/admin/posts/:id
// @access  Private (Contributor+)
router.patch('/posts/:id', [
  protect,
  can('post:edit'),
  param('id').isMongoId().withMessage('Invalid post ID'),
  body('title').optional().trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('body').optional().isString(),
  body('tags').optional().isArray(),
  body('categories').optional().isArray(),
  body('status').optional().isIn(['draft', 'review', 'scheduled', 'published']).withMessage('Invalid status'),
  body('scheduledAt').optional().isISO8601().withMessage('Invalid scheduled date')
], updateAdminPost);

// @desc    Get post preview URL
// @route   GET /api/admin/posts/:id/preview
// @access  Private (Admin+)
router.get('/posts/:id/preview', [
  protect,
  can('post:view'),
  param('id').isMongoId().withMessage('Invalid post ID')
], getPostPreview);

// @desc    Get content page
// @route   GET /api/admin/content-page
// @access  Private (Admin+)
router.get('/content-page', [
  protect,
  can('post:view')
], getContentPage);

// @desc    Save content page sections (draft ok)
// @route   POST /api/admin/content-page
// @access  Private (Editor+)
router.post('/content-page', [
  protect,
  can('post:edit'),
  body('sections').isArray().withMessage('Sections must be an array'),
  body('seo').optional().isObject().withMessage('SEO must be an object')
], saveContentPage);

// @desc    Publish content page sections
// @route   PATCH /api/admin/content-page/publish
// @access  Private (Editor+)
router.patch('/content-page/publish', [
  protect,
  can('post:publish')
], publishContentPage);

module.exports = router;
