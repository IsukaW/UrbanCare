const express = require('express');
const {
  createDoctor,
  loginDoctor,
  listDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  updateDoctorSchedule
} = require('../controllers/doctorController');
const {
  registerPendingDoctor,
  listPendingRegistrations,
  getCertificateFile,
  approvePendingRegistration,
  rejectPendingRegistration
} = require('../controllers/pendingRegistrationController');
const { upload } = require('../middleware/uploadCertificates');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.post('/login', loginDoctor);
router.post('/register', upload.array('certificates', 10), registerPendingDoctor);

router.get('/pending-registrations', authenticate, authorize('admin'), listPendingRegistrations);
router.get(
  '/pending-registrations/:pendingId/certificates/:fileIndex',
  authenticate,
  authorize('admin'),
  getCertificateFile
);
router.post(
  '/pending-registrations/:pendingId/approve',
  authenticate,
  authorize('admin'),
  approvePendingRegistration
);
router.post(
  '/pending-registrations/:pendingId/reject',
  authenticate,
  authorize('admin'),
  rejectPendingRegistration
);

router.post('/', authenticate, authorize('admin', 'doctor'), createDoctor);
router.get('/', authenticate, authorize('admin', 'doctor', 'patient'), listDoctors);
router.get('/:id', authenticate, authorize('admin', 'doctor', 'patient'), getDoctorById);
router.patch('/:id/schedule', authenticate, authorize('admin', 'doctor'), updateDoctorSchedule);
router.patch('/:id', authenticate, authorize('admin', 'doctor'), updateDoctor);
router.delete('/:id', authenticate, authorize('admin'), deleteDoctor);

module.exports = router;
