const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: [true, 'Category slug is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  color: {
    type: String,
    default: '#3B82F6', // Default blue color
    match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color']
  },
  icon: {
    type: String,
    trim: true
  },
  image: {
    url: String,
    alt: String,
    caption: String
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  seo: {
    metaTitle: String,
    metaDescription: String
  },
  stats: {
    postCount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
categorySchema.index({ name: 'text', description: 'text' });
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1, sortOrder: 1 });
categorySchema.index({ isActive: 1, sortOrder: 1 });

// Virtual for children categories
categorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});

// Virtual for full path (breadcrumb)
categorySchema.virtual('path').get(function() {
  if (this.parent) {
    return `${this.parent.path}/${this.slug}`;
  }
  return this.slug;
});

// Pre-save middleware to generate slug
categorySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  next();
});

// Pre-save middleware to ensure unique slug
categorySchema.pre('save', async function(next) {
  if (this.isModified('slug')) {
    const existingCategory = await this.constructor.findOne({ 
      slug: this.slug, 
      _id: { $ne: this._id } 
    });
    if (existingCategory) {
      this.slug = `${this.slug}-${Date.now()}`;
    }
  }
  next();
});

// Static method to find active categories
categorySchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
};

// Static method to find root categories (no parent)
categorySchema.statics.findRootCategories = function() {
  return this.find({ parent: null, isActive: true }).sort({ sortOrder: 1, name: 1 });
};

// Static method to find categories with post count
categorySchema.statics.findWithPostCount = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'categories',
        as: 'posts'
      }
    },
    {
      $addFields: {
        'stats.postCount': { $size: '$posts' }
      }
    },
    { $sort: { sortOrder: 1, name: 1 } }
  ]);
};

// Instance method to get all descendants
categorySchema.methods.getDescendants = async function() {
  const children = await this.constructor.find({ parent: this._id });
  let descendants = [...children];
  
  for (const child of children) {
    const childDescendants = await child.getDescendants();
    descendants = descendants.concat(childDescendants);
  }
  
  return descendants;
};

// Instance method to get breadcrumb path
categorySchema.methods.getBreadcrumb = async function() {
  const breadcrumb = [];
  let current = this;
  
  while (current) {
    breadcrumb.unshift({
      _id: current._id,
      name: current.name,
      slug: current.slug
    });
    
    if (current.parent) {
      current = await this.constructor.findById(current.parent);
    } else {
      current = null;
    }
  }
  
  return breadcrumb;
};

// Update post count when posts are added/removed
categorySchema.methods.updatePostCount = async function() {
  const Post = mongoose.model('Post');
  const count = await Post.countDocuments({ categories: this._id });
  this.stats.postCount = count;
  return this.save();
};

module.exports = mongoose.model('Category', categorySchema);

