const express = require('express');
const {
  createDoctor,
  listDoctors,
  getDoctorById,
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
router.get('/:id', authenticate, authorize('admin', 'doctor', 'patient'), getDoctorById);
router.post('/:id/photo', authenticate, authorize('admin', 'doctor'), upload.single('photo'), uploadProfilePhoto);
router.patch('/:id/schedule', authenticate, authorize('admin', 'doctor'), updateDoctorSchedule);

module.exports = router;

