const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  author: {
    name: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Author email is required'],
      lowercase: true,
      trim: true
    },
    website: {
      type: String,
      trim: true
    }
  },
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'spam'],
    default: 'pending'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  likes: {
    type: Number,
    default: 0
  },
  replies: [{
    author: {
      name: {
        type: String,
        required: true,
        trim: true
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
      }
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Reply cannot exceed 500 characters']
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
commentSchema.index({ post: 1, status: 1, createdAt: -1 });
commentSchema.index({ 'author.email': 1 });
commentSchema.index({ status: 1 });

// Virtual for total replies count
commentSchema.virtual('repliesCount').get(function() {
  return this.replies.length;
});

// Pre-save middleware to set moderation timestamp
commentSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status !== 'pending') {
    this.moderatedAt = new Date();
  }
  next();
});

// Static method to find approved comments
commentSchema.statics.findApproved = function(postId) {
  return this.find({ post: postId, status: 'approved' }).sort({ createdAt: -1 });
};

// Static method to find pending comments
commentSchema.statics.findPending = function() {
  return this.find({ status: 'pending' }).sort({ createdAt: -1 });
};

// Instance method to approve comment
commentSchema.methods.approve = function(moderatorId) {
  this.status = 'approved';
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  return this.save();
};

// Instance method to reject comment
commentSchema.methods.reject = function(moderatorId) {
  this.status = 'rejected';
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Comment', commentSchema);
