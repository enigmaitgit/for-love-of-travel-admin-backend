const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  url: {
    type: String,
    required: [true, 'Media URL is required']
  },
  thumbnailUrl: {
    type: String
  },
  type: {
    type: String,
    enum: ['image', 'video', 'document', 'audio'],
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true // in bytes
  },
  dimensions: {
    width: Number,
    height: Number
  },
  duration: {
    type: Number // for video/audio files in seconds
  },
  alt: {
    type: String,
    trim: true,
    maxlength: [200, 'Alt text cannot exceed 200 characters']
  },
  caption: {
    type: String,
    trim: true,
    maxlength: [500, 'Caption cannot exceed 500 characters']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  usage: [{
    type: {
      type: String,
      enum: ['post', 'avatar', 'banner', 'gallery']
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId
    },
    referenceType: {
      type: String
    }
  }],
  metadata: {
    camera: String,
    location: String,
    dateTaken: Date,
    software: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
mediaSchema.index({ type: 1, uploadedBy: 1, createdAt: -1 });
mediaSchema.index({ tags: 1 });
mediaSchema.index({ filename: 'text', originalName: 'text', alt: 'text' });

// Virtual for formatted file size
mediaSchema.virtual('formattedSize').get(function() {
  const bytes = this.size;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Virtual for aspect ratio
mediaSchema.virtual('aspectRatio').get(function() {
  if (this.dimensions && this.dimensions.width && this.dimensions.height) {
    return (this.dimensions.width / this.dimensions.height).toFixed(2);
  }
  return null;
});

// Static method to find images
mediaSchema.statics.findImages = function() {
  return this.find({ type: 'image' }).sort({ createdAt: -1 });
};

// Static method to find by type
mediaSchema.statics.findByType = function(type) {
  return this.find({ type }).sort({ createdAt: -1 });
};

// Instance method to add usage reference
mediaSchema.methods.addUsage = function(usageType, referenceId, referenceType) {
  this.usage.push({
    type: usageType,
    referenceId,
    referenceType
  });
  return this.save();
};

// Instance method to remove usage reference
mediaSchema.methods.removeUsage = function(referenceId) {
  this.usage = this.usage.filter(usage => 
    usage.referenceId.toString() !== referenceId.toString()
  );
  return this.save();
};

module.exports = mongoose.model('Media', mediaSchema);
