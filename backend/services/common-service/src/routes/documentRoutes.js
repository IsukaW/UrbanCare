const express = require('express');
const {
  uploadDocuments,
  listDocuments,
  getDocument,
  downloadDocument,
  deleteDocument,
} = require('../controllers/documentController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const upload = require('../config/multer');

const router = express.Router();

// All routes require authentication; any role may use documents
const auth = [authenticate, authorize('admin', 'doctor', 'patient')];

// Upload (multipart/form-data, field name: "files")
router.post('/', auth, upload.array('files', 5), uploadDocuments);

// List documents accessible to the requester
router.get('/', auth, listDocuments);

// Get single document metadata
router.get('/:id', auth, getDocument);

// Download the actual file (access-controlled)
router.get('/:id/download', auth, downloadDocument);

// Delete document
router.delete('/:id', auth, deleteDocument);

module.exports = router;
