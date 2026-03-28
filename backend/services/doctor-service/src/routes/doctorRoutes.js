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
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.post('/login', loginDoctor);
router.post('/', authenticate, authorize('admin', 'doctor'), createDoctor);
router.get('/', authenticate, authorize('admin', 'doctor', 'patient'), listDoctors);
router.get('/:id', authenticate, authorize('admin', 'doctor', 'patient'), getDoctorById);
router.patch('/:id/schedule', authenticate, authorize('admin', 'doctor'), updateDoctorSchedule);
router.patch('/:id', authenticate, authorize('admin', 'doctor'), updateDoctor);
router.delete('/:id', authenticate, authorize('admin'), deleteDoctor);

module.exports = router;
