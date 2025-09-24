const mongoose = require('mongoose');

// Content section schemas for the content builder
const heroSectionSchema = new mongoose.Schema({
  type: { type: String, default: 'hero' },
  backgroundImage: { type: String, required: true },
  title: { type: String, required: true, maxlength: 200 },
  subtitle: { type: String },
  author: { type: String },
  publishDate: { type: String },
  readTime: { type: String },
  overlayOpacity: { type: Number, default: 0.3, min: 0, max: 1 },
  height: {
    mobile: { type: String, default: '70vh' },
    tablet: { type: String, default: '80vh' },
    desktop: { type: String, default: '90vh' }
  },
  titleSize: {
    mobile: { type: String, default: 'text-3xl' },
    tablet: { type: String, default: 'text-5xl' },
    desktop: { type: String, default: 'text-6xl' }
  },
  parallaxEnabled: { type: Boolean, default: true },
  parallaxSpeed: { type: Number, default: 0.5, min: 0, max: 2 },
  backgroundPosition: { type: String, enum: ['center', 'top', 'bottom', 'left', 'right'], default: 'center' },
  backgroundSize: { type: String, enum: ['cover', 'contain', 'auto'], default: 'cover' },
  animation: {
    enabled: { type: Boolean, default: true },
    type: { type: String, enum: ['fadeIn', 'slideUp', 'scaleIn', 'none'], default: 'fadeIn' },
    duration: { type: Number, default: 0.8, min: 0.1, max: 3 },
    delay: { type: Number, default: 0, min: 0, max: 2 }
  },
  socialSharing: {
    enabled: { type: Boolean, default: true },
    platforms: [{ type: String, enum: ['facebook', 'twitter', 'linkedin', 'copy', 'share'] }],
    position: { type: String, enum: ['bottom-right', 'bottom-left', 'top-right', 'top-left'], default: 'bottom-right' },
    style: { type: String, enum: ['glass', 'solid', 'outline'], default: 'glass' }
  }
}, { _id: false });

const textSectionSchema = new mongoose.Schema({
  type: { type: String, default: 'text' },
  content: { type: String, required: true },
  hasDropCap: { type: Boolean, default: false },
  alignment: { type: String, enum: ['left', 'center', 'right', 'justify'], default: 'left' },
  fontSize: { type: String, enum: ['sm', 'base', 'lg', 'xl'], default: 'base' },
  fontFamily: { type: String, enum: ['inter', 'serif', 'sans', 'mono'], default: 'inter' },
  lineHeight: { type: String, enum: ['tight', 'snug', 'normal', 'relaxed', 'loose'], default: 'relaxed' },
  dropCap: {
    enabled: { type: Boolean, default: false },
    size: { type: String, enum: ['text-4xl', 'text-5xl', 'text-6xl'], default: 'text-4xl' },
    color: { type: String, default: 'text-gray-900' },
    fontWeight: { type: String, enum: ['normal', 'medium', 'semibold', 'bold'], default: 'semibold' },
    float: { type: Boolean, default: true }
  },
  animation: {
    enabled: { type: Boolean, default: true },
    type: { type: String, enum: ['fadeIn', 'slideUp', 'slideInLeft', 'slideInRight', 'none'], default: 'fadeIn' },
    duration: { type: Number, default: 0.3, min: 0.1, max: 3 },
    delay: { type: Number, default: 0.1, min: 0, max: 2 }
  }
}, { _id: false });

const imageSectionSchema = new mongoose.Schema({
  type: { type: String, default: 'image' },
  imageUrl: { type: String, required: true },
  altText: { type: String },
  caption: { type: String },
  width: { type: Number },
  height: { type: Number },
  alignment: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
  rounded: { type: Boolean, default: true },
  shadow: { type: Boolean, default: true }
}, { _id: false });

const galleryImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  altText: { type: String },
  caption: { type: String },
  width: { type: Number },
  height: { type: Number }
}, { _id: false });

const gallerySectionSchema = new mongoose.Schema({
  type: { type: String, default: 'gallery' },
  images: [galleryImageSchema],
  layout: { type: String, enum: ['grid', 'masonry', 'carousel', 'postcard', 'complex'], default: 'grid' },
  columns: { type: Number, min: 1, max: 6, default: 3 },
  spacing: { type: String, enum: ['sm', 'md', 'lg'], default: 'md' },
  responsive: {
    mobile: {
      layout: { type: String, enum: ['grid', 'carousel'], default: 'grid' },
      columns: { type: Number, min: 1, max: 2, default: 2 }
    },
    desktop: {
      layout: { type: String, enum: ['grid', 'masonry', 'postcard', 'complex'], default: 'grid' },
      columns: { type: Number, min: 1, max: 6, default: 3 }
    }
  },
  hoverEffects: {
    enabled: { type: Boolean, default: true },
    scale: { type: Number, default: 1.03, min: 1, max: 1.2 },
    shadow: { type: Boolean, default: true },
    overlay: { type: Boolean, default: true }
  },
  animation: {
    enabled: { type: Boolean, default: true },
    type: { type: String, enum: ['fadeIn', 'slideUp', 'stagger', 'none'], default: 'fadeIn' },
    duration: { type: Number, default: 0.5, min: 0.1, max: 3 },
    stagger: { type: Number, default: 0.1, min: 0, max: 1 }
  }
}, { _id: false });

const popularPostsSectionSchema = new mongoose.Schema({
  type: { type: String, default: 'popular-posts' },
  title: { type: String, default: 'Popular Posts' },
  description: { type: String },
  featuredPost: {
    title: { type: String },
    excerpt: { type: String },
    imageUrl: { type: String },
    readTime: { type: String },
    publishDate: { type: String },
    category: { type: String }
  },
  sidePosts: [{
    title: { type: String },
    excerpt: { type: String },
    imageUrl: { type: String },
    readTime: { type: String },
    publishDate: { type: String }
  }]
}, { _id: false });

const breadcrumbItemSchema = new mongoose.Schema({
  label: { type: String, required: true },
  href: { type: String }
}, { _id: false });

const breadcrumbSectionSchema = new mongoose.Schema({
  type: { type: String, default: 'breadcrumb' },
  enabled: { type: Boolean, default: true },
  items: [breadcrumbItemSchema],
  style: {
    separator: { type: String, enum: ['>', '→', '|', '/'], default: '>' },
    textSize: { type: String, enum: ['sm', 'base', 'lg'], default: 'sm' },
    showHomeIcon: { type: Boolean, default: false },
    color: { type: String, enum: ['gray', 'blue', 'black'], default: 'gray' }
  }
}, { _id: false });

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Post title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    required: [true, 'Post slug is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  body: {
    type: String,
    required: [true, 'Post content is required'],
    minlength: [50, 'Content must be at least 50 characters']
  },
  // New content sections for the content builder
  contentSections: [{
    type: { type: String, enum: ['hero', 'text', 'image', 'gallery', 'popular-posts', 'breadcrumb'] },
    data: mongoose.Schema.Types.Mixed // Store the section data based on type
  }],
  excerpt: {
    type: String,
    maxlength: [500, 'Excerpt cannot exceed 500 characters']
  },
  featuredImage: {
    url: String,
    alt: String,
    caption: String
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  status: {
    type: String,
    enum: ['draft', 'review', 'scheduled', 'published', 'archived'],
    default: 'draft'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  publishedAt: {
    type: Date
  },
  scheduledAt: {
    type: Date
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    jsonLd: {
      type: Boolean,
      default: false
    }
  },
  // Enhanced breadcrumb support
  breadcrumb: {
    enabled: { type: Boolean, default: true },
    items: [breadcrumbItemSchema]
  },
  stats: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    }
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  readingTime: {
    type: Number, // in minutes
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
postSchema.index({ title: 'text', body: 'text', tags: 'text' });
postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ slug: 1 });

// Virtual for reading time calculation
postSchema.virtual('calculatedReadingTime').get(function() {
  const wordsPerMinute = 200;
  const wordCount = this.body.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
});

// Pre-save middleware to calculate reading time
postSchema.pre('save', function(next) {
  if (this.isModified('body')) {
    this.readingTime = this.calculatedReadingTime;
  }
  next();
});

// Pre-save middleware to set publishedAt
postSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Static method to find published posts
postSchema.statics.findPublished = function() {
  return this.find({ status: 'published' }).sort({ publishedAt: -1 });
};

// Static method to find posts by status
postSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ updatedAt: -1 });
};

// Instance method to generate excerpt
postSchema.methods.generateExcerpt = function(length = 150) {
  if (this.excerpt) return this.excerpt;
  return this.body.replace(/<[^>]*>/g, '').substring(0, length) + '...';
};

module.exports = mongoose.model('Post', postSchema);
