const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadsRoot = path.join(__dirname, '..', '..', 'uploads', 'certificates');

function ensureDir() {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureDir();
    cb(null, uploadsRoot);
  },
  filename(req, file, cb) {
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    cb(null, safe);
  }
});

function fileFilter(_req, file, cb) {
  if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF certificate files are allowed'));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 12 }
});

module.exports = { upload, uploadsRoot };
