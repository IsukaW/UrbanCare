const express = require('express');
const {
  createPatient,
  getPatientById,
  updatePatientHistory
} = require('../controllers/patientController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.post('/', authenticate, authorize('admin', 'patient'), createPatient);
router.get('/:id', authenticate, authorize('admin', 'doctor', 'patient'), getPatientById);
router.patch('/:id/history', authenticate, authorize('admin', 'doctor'), updatePatientHistory);

module.exports = router;
