const multer = require('multer');
const { StatusCodes } = require('http-status-codes');
const ApiError = require('../utils/ApiError');

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

// 10 MB per file, max 5 files per request
// Files are held in memory as Buffer and converted to base64 before DB save.
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        StatusCodes.BAD_REQUEST,
        'Unsupported file type. Allowed: PDF, JPG, PNG, DOC, DOCX'
      )
    );
  }
};

module.exports = multer({
  storage: multer.memoryStorage(), // buffer stored in req.file.buffer
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
});
