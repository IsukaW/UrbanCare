const multer = require('multer');
const { StatusCodes } = require('http-status-codes');
const ApiError = require('../utils/ApiError');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

// 5 MB limit, single file, held in memory for forwarding to common-service
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(StatusCodes.BAD_REQUEST, 'Only JPEG, PNG, or WebP image files are allowed for profile photos'));
    }
  }
});

module.exports = { upload };
