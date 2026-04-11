const express = require('express');
const {
  createDoctor,
  listDoctors,
  getDoctorById,
  getDoctorSchedule,
  getAvailableSlots,
  getReservedSlots,
  reserveSlot,
  releaseSlot,
  updateDoctor,
  deleteDoctor,
  updateDoctorSchedule,
  uploadProfilePhoto
} = require('../controllers/doctorController');
const { upload } = require('../middleware/uploadPhoto');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.post('/', authenticate, authorize('doctor'), createDoctor);
router.get('/', authenticate, authorize('admin', 'doctor', 'patient'), listDoctors);
router.get('/:id/schedule', authenticate, authorize('admin', 'doctor', 'patient'), getDoctorSchedule);
router.get('/:id/slots/available', authenticate, authorize('admin', 'doctor', 'patient'), getAvailableSlots);
router.get('/:id/slots/reserved', authenticate, authorize('admin', 'doctor', 'patient'), getReservedSlots);
router.post('/:id/slots/:slotId/reserve', authenticate, authorize('admin', 'doctor', 'patient'), reserveSlot);
router.post('/:id/slots/:slotId/release', authenticate, authorize('admin', 'doctor', 'patient'), releaseSlot);
router.get('/:id', authenticate, authorize('admin', 'doctor', 'patient'), getDoctorById);
router.post('/:id/photo', authenticate, authorize('doctor'), upload.single('photo'), uploadProfilePhoto);
router.patch('/:id/schedule', authenticate, authorize('admin', 'doctor'), updateDoctorSchedule);
router.patch('/:id', authenticate, authorize('doctor'), updateDoctor);
router.delete('/:id', authenticate, authorize('admin'), deleteDoctor);

module.exports = router;

