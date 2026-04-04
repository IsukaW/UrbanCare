const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const upload = require('../config/multer');
const {
  uploadDocument,
  listDocuments,
  getDocument,
  downloadDocument,
  deleteDocument
} = require('../controllers/medicalReportController');
const { ROLES } = require('../utils/roles');

const router = express.Router({ mergeParams: true });

const auth = [authenticate, authorize(ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT)];

// POST   /patients/:patientId/documents              — upload one document
router.post('/', auth, upload.single('file'), uploadDocument);

// GET    /patients/:patientId/documents              — list documents
router.get('/', auth, listDocuments);

// GET    /patients/:patientId/documents/:documentId  — view inline
router.get('/:documentId', auth, getDocument);

// GET    /patients/:patientId/documents/:documentId/download — download
router.get('/:documentId/download', auth, downloadDocument);

// DELETE /patients/:patientId/documents/:documentId  — delete
router.delete('/:documentId', auth, deleteDocument);

module.exports = router;