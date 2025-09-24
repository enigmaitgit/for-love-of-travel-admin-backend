const express = require('express');
const { body, param, query } = require('express-validator');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree,
  reorderCategories,
  getCategoryStats
} = require('../controllers/categoryController');
const { protect, can } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all categories
// @route   GET /api/v1/categories
// @access  Public
router.get('/', getCategories);

// @desc    Get category tree (hierarchical structure)
// @route   GET /api/v1/categories/tree
// @access  Public
router.get('/tree', getCategoryTree);

// @desc    Get category statistics
// @route   GET /api/v1/categories/stats
// @access  Private (Admin+)
router.get('/stats', protect, can('category:view'), getCategoryStats);

// @desc    Get single category
// @route   GET /api/v1/categories/:id
// @access  Public
router.get('/:id', getCategory);

// @desc    Create new category
// @route   POST /api/v1/categories
// @access  Private (Admin+)
router.post('/', [
  protect,
  can('category:create'),
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Category name is required and must be less than 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color'),
  body('icon').optional().trim().isLength({ max: 50 }).withMessage('Icon must be less than 50 characters'),
  body('parent').optional().isMongoId().withMessage('Invalid parent category ID'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer'),
  body('seo.metaTitle').optional().isLength({ max: 60 }).withMessage('Meta title must be less than 60 characters'),
  body('seo.metaDescription').optional().isLength({ max: 160 }).withMessage('Meta description must be less than 160 characters')
], createCategory);

// @desc    Update category
// @route   PUT /api/v1/categories/:id
// @route   PATCH /api/v1/categories/:id
// @access  Private (Admin+)
router.put('/:id', [
  protect,
  can('category:edit'),
  param('id').isMongoId().withMessage('Invalid category ID'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Category name must be less than 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color'),
  body('icon').optional().trim().isLength({ max: 50 }).withMessage('Icon must be less than 50 characters'),
  body('parent').optional().isMongoId().withMessage('Invalid parent category ID'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer'),
  body('seo.metaTitle').optional().isLength({ max: 60 }).withMessage('Meta title must be less than 60 characters'),
  body('seo.metaDescription').optional().isLength({ max: 160 }).withMessage('Meta description must be less than 160 characters')
], updateCategory);

router.patch('/:id', [
  protect,
  can('category:edit'),
  param('id').isMongoId().withMessage('Invalid category ID'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Category name must be less than 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color'),
  body('icon').optional().trim().isLength({ max: 50 }).withMessage('Icon must be less than 50 characters'),
  body('parent').optional().isMongoId().withMessage('Invalid parent category ID'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer'),
  body('seo.metaTitle').optional().isLength({ max: 60 }).withMessage('Meta title must be less than 60 characters'),
  body('seo.metaDescription').optional().isLength({ max: 160 }).withMessage('Meta description must be less than 160 characters')
], updateCategory);

// @desc    Delete category
// @route   DELETE /api/v1/categories/:id
// @access  Private (Admin only)
router.delete('/:id', [
  protect,
  can('category:delete'),
  param('id').isMongoId().withMessage('Invalid category ID')
], deleteCategory);

// @desc    Reorder categories
// @route   PATCH /api/v1/categories/reorder
// @access  Private (Admin+)
router.patch('/reorder', [
  protect,
  can('category:edit'),
  body('categories').isArray({ min: 1 }).withMessage('Categories must be an array'),
  body('categories.*.id').isMongoId().withMessage('Invalid category ID'),
  body('categories.*.sortOrder').isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer')
], reorderCategories);

module.exports = router;
