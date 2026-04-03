const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const upload = require('../config/multer');
const {
  uploadDocuments,
  listDocuments,
  getDocument,
  downloadDocument,
  deleteDocument
} = require('../controllers/medicalReportController');
const { ROLES } = require('../utils/roles');

const router = express.Router({ mergeParams: true });

const auth = [authenticate, authorize(ROLES.ADMIN, ROLES.DOCTOR, ROLES.PATIENT)];

router.post('/', auth, upload.array('files', 5), uploadDocuments);
router.get('/', auth, listDocuments);
router.get('/:documentId', auth, getDocument);
router.get('/:documentId/download', auth, downloadDocument);
router.delete('/:documentId', auth, deleteDocument);

module.exports = router;