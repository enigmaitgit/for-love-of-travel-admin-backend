const { validationResult } = require('express-validator');

// @desc    Revalidate cached content
// @route   POST /api/revalidate
// @access  Private (with secret header)
const revalidatePath = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
    }

    // Check for secret header
    const secret = req.headers['x-revalidate-secret'];
    const expectedSecret = process.env.REVALIDATE_SECRET || 'revalidate-secret';

    if (secret !== expectedSecret) {
      return res.status(401).json({
        success: false,
        message: 'Invalid secret'
      });
    }

    const { path = '/' } = req.body;

    // In a real implementation, this would trigger cache invalidation
    // For now, we'll just log the revalidation request
    console.log(`Revalidating path: ${path}`);

    res.json({
      success: true,
      message: 'Path revalidated successfully',
      path
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  revalidatePath
};
