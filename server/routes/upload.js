const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');

/**
 * POST /api/upload
 * Upload a single file (image, video, or document).
 * Returns the URL path to the uploaded file.
 */
router.post('/', protect, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Build the URL path
    const filePath = req.file.path.replace(/\\/g, '/');
    const uploadsIndex = filePath.indexOf('uploads/');
    const relativePath = filePath.substring(uploadsIndex);

    // Determine file type
    let type = 'file';
    if (req.file.mimetype.startsWith('image/')) type = 'image';
    else if (req.file.mimetype.startsWith('video/')) type = 'video';

    res.status(200).json({
      success: true,
      file: {
        url: `/${relativePath}`,
        type,
        name: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during file upload',
    });
  }
});

module.exports = router;
