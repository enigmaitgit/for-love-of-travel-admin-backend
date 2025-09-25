const express = require('express');
const { param, query } = require('express-validator');
const {
  getPublicContentPage,
  getPublicPostBySlug
} = require('../controllers/publicController');

const router = express.Router();

// @desc    Get published content page
// @route   GET /api/content-page
// @access  Public
router.get('/content-page', [
  query('version').optional().isIn(['published']).withMessage('Invalid version')
], getPublicContentPage);

// @desc    Get public post by slug
// @route   GET /api/posts/:slug
// @access  Public
router.get('/posts/:slug', [
  param('slug').matches(/^[a-z0-9-]+$/).withMessage('Invalid slug format')
], getPublicPostBySlug);

module.exports = router;
