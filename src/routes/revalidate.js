const express = require('express');
const { body } = require('express-validator');
const { revalidatePath } = require('../controllers/revalidateController');

const router = express.Router();

// @desc    Revalidate cached content
// @route   POST /api/revalidate
// @access  Private (with secret header)
router.post('/', [
  body('path').optional().isString().withMessage('Path must be a string')
], revalidatePath);

module.exports = router;
