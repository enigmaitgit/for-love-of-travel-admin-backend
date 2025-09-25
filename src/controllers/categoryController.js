const Category = require('../models/Category');
const Post = require('../models/Post');
const { validationResult } = require('express-validator');

// @desc    Get all categories
// @route   GET /api/v1/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const {
      includePostCount = false,
      includeInactive = false,
      parent = null
    } = req.query;

    let filter = {};
    
    if (!includeInactive) {
      filter.isActive = true;
    }
    
    if (parent !== undefined) {
      filter.parent = parent === 'null' ? null : parent;
    }

    let categories;
    
    if (includePostCount) {
      categories = await Category.findWithPostCount();
    } else {
      categories = await Category.find(filter)
        .populate('parent', 'name slug')
        .sort({ sortOrder: 1, name: 1 })
        .lean();
    }

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single category
// @route   GET /api/v1/categories/:id
// @access  Public
const getCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('parent', 'name slug')
      .populate('children', 'name slug description color')
      .lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get breadcrumb path
    const breadcrumb = await Category.findById(req.params.id).then(cat => 
      cat ? cat.getBreadcrumb() : []
    );

    res.json({
      success: true,
      data: {
        ...category,
        breadcrumb
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new category
// @route   POST /api/v1/categories
// @access  Private (Admin+)
const createCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const categoryData = req.body;

    // Generate slug from name if not provided
    if (!categoryData.slug) {
      categoryData.slug = categoryData.name
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
    }

    // Validate parent category exists
    if (categoryData.parent) {
      const parentCategory = await Category.findById(categoryData.parent);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found'
        });
      }
    }

    const category = await Category.create(categoryData);

    await category.populate('parent', 'name slug');

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/v1/categories/:id
// @route   PATCH /api/v1/categories/:id
// @access  Private (Admin+)
const updateCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    let category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Update slug if name changed
    if (req.body.name && req.body.name !== category.name) {
      const newSlug = req.body.name
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');

      // Check if new slug is unique
      const existingCategory = await Category.findOne({ 
        slug: newSlug, 
        _id: { $ne: req.params.id } 
      });
      if (existingCategory) {
        req.body.slug = `${newSlug}-${Date.now()}`;
      } else {
        req.body.slug = newSlug;
      }
    }

    // Validate parent category exists and prevent circular reference
    if (req.body.parent) {
      if (req.body.parent === req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot be its own parent'
        });
      }

      const parentCategory = await Category.findById(req.body.parent);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found'
        });
      }

      // Check for circular reference
      const descendants = await category.getDescendants();
      const hasCircularReference = descendants.some(desc => 
        desc._id.toString() === req.body.parent
      );
      
      if (hasCircularReference) {
        return res.status(400).json({
          success: false,
          message: 'Cannot set parent: would create circular reference'
        });
      }
    }

    category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('parent', 'name slug');

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category
// @route   DELETE /api/v1/categories/:id
// @access  Private (Admin only)
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has children
    const children = await Category.find({ parent: req.params.id });
    if (children.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with child categories. Please move or delete child categories first.'
      });
    }

    // Check if category has posts
    const postsWithCategory = await Post.countDocuments({ categories: req.params.id });
    if (postsWithCategory > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category that has posts. Please move posts to other categories first.'
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get category tree (hierarchical structure)
// @route   GET /api/v1/categories/tree
// @access  Public
const getCategoryTree = async (req, res, next) => {
  try {
    const { includePostCount = false } = req.query;

    // Get all active categories
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    // Build tree structure
    const buildTree = (parentId = null) => {
      return categories
        .filter(cat => {
          if (parentId === null) return !cat.parent;
          return cat.parent && cat.parent.toString() === parentId.toString();
        })
        .map(cat => ({
          ...cat,
          children: buildTree(cat._id)
        }));
    };

    const tree = buildTree();

    // Add post counts if requested
    if (includePostCount) {
      const postCounts = await Post.aggregate([
        { $unwind: '$categories' },
        { $group: { _id: '$categories', count: { $sum: 1 } } }
      ]);

      const addPostCounts = (nodes) => {
        return nodes.map(node => {
          const postCount = postCounts.find(pc => 
            pc._id.toString() === node._id.toString()
          );
          return {
            ...node,
            postCount: postCount ? postCount.count : 0,
            children: addPostCounts(node.children)
          };
        });
      };

      const treeWithCounts = addPostCounts(tree);
      res.json({
        success: true,
        data: treeWithCounts
      });
    } else {
      res.json({
        success: true,
        data: tree
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder categories
// @route   PATCH /api/v1/categories/reorder
// @access  Private (Admin+)
const reorderCategories = async (req, res, next) => {
  try {
    const { categories } = req.body; // Array of { id, sortOrder }

    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: 'Categories must be an array'
      });
    }

    const updatePromises = categories.map(cat => 
      Category.findByIdAndUpdate(cat.id, { sortOrder: cat.sortOrder })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Categories reordered successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get category statistics
// @route   GET /api/v1/categories/stats
// @access  Private (Admin+)
const getCategoryStats = async (req, res, next) => {
  try {
    const stats = await Category.aggregate([
      {
        $group: {
          _id: null,
          totalCategories: { $sum: 1 },
          activeCategories: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          inactiveCategories: {
            $sum: { $cond: ['$isActive', 0, 1] }
          }
        }
      }
    ]);

    const categoryWithMostPosts = await Post.aggregate([
      { $unwind: '$categories' },
      { $group: { _id: '$categories', postCount: { $sum: 1 } } },
      { $sort: { postCount: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' }
    ]);

    res.json({
      success: true,
      data: {
        ...stats[0],
        categoryWithMostPosts: categoryWithMostPosts[0] || null
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree,
  reorderCategories,
  getCategoryStats
};

