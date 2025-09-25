const mongoose = require('mongoose');

// Content section schemas for the content builder
const heroSectionSchema = new mongoose.Schema({
  type: { type: String, default: 'hero' },
  props: {
    imageUrl: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: { type: String },
    overlay: { type: Boolean, default: false },
    cta: {
      label: { type: String },
      href: { type: String }
    }
  }
}, { _id: false });

const breadcrumbSectionSchema = new mongoose.Schema({
  type: { type: String, default: 'breadcrumb' },
  props: {
    items: [{
      label: { type: String, required: true },
      href: { type: String }
    }]
  }
}, { _id: false });

const textSectionSchema = new mongoose.Schema({
  type: { type: String, default: 'text' },
  props: {
    html: { type: String },
    markdown: { type: String }
  }
}, { _id: false });

const singleImageSectionSchema = new mongoose.Schema({
  type: { type: String, default: 'singleImage' },
  props: {
    url: { type: String, required: true },
    caption: { type: String },
    alt: { type: String }
  }
}, { _id: false });

const imageGallerySectionSchema = new mongoose.Schema({
  type: { type: String, default: 'imageGallery' },
  props: {
    images: [{
      url: { type: String, required: true },
      alt: { type: String },
      caption: { type: String }
    }],
    layout: { type: String, enum: ['grid', 'masonry'], default: 'grid' }
  }
}, { _id: false });

const popularPostsSectionSchema = new mongoose.Schema({
  type: { type: String, default: 'popularPosts' },
  props: {
    postIds: [{ type: String }],
    layout: { type: String, enum: ['grid', 'list'], default: 'grid' }
  }
}, { _id: false });

const contentPageSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    default: 'content'
  },
  status: {
    type: String,
    enum: ['draft', 'review', 'scheduled', 'published'],
    default: 'draft'
  },
  sections: [mongoose.Schema.Types.Mixed], // Store any section type
  seo: {
    title: { type: String },
    description: { type: String }
  },
  version: {
    type: Number,
    default: 1
  },
  publishedAt: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
contentPageSchema.index({ slug: 1 });
contentPageSchema.index({ status: 1 });

// Static method to find published content page
contentPageSchema.statics.findPublished = function() {
  return this.findOne({ status: 'published', slug: 'content' });
};

module.exports = mongoose.model('ContentPage', contentPageSchema);
