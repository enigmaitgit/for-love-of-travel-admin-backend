const mongoose = require('mongoose');

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
    type: String,
    trim: true,
    lowercase: true
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
