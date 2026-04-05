const express = require('express');
const {
  createDoctor,
  listDoctors,
  getDoctorById,
  getDoctorSchedule,
  updateDoctor,
  deleteDoctor,
  updateDoctorSchedule,
  uploadProfilePhoto
} = require('../controllers/doctorController');
const { upload } = require('../middleware/uploadPhoto');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.post('/', authenticate, authorize('admin', 'doctor'), createDoctor);
router.get('/', authenticate, authorize('admin', 'doctor', 'patient'), listDoctors);
router.get('/:id/schedule', authenticate, authorize('admin', 'doctor', 'patient'), getDoctorSchedule);
router.get('/:id', authenticate, authorize('admin', 'doctor', 'patient'), getDoctorById);
router.post('/:id/photo', authenticate, authorize('admin', 'doctor'), upload.single('photo'), uploadProfilePhoto);
router.patch('/:id/schedule', authenticate, authorize('admin', 'doctor'), updateDoctorSchedule);
router.patch('/:id', authenticate, authorize('admin', 'doctor'), updateDoctor);
router.delete('/:id', authenticate, authorize('admin'), deleteDoctor);

module.exports = router;

