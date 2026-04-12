const express = require('express');
const { listDoctors, getDoctorProfile, getDoctorAvailableSlots } = require('../controllers/doctorController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.get('/', authenticate, authorize('admin', 'doctor', 'patient'), listDoctors);
router.get('/:doctorId', authenticate, authorize('admin', 'doctor', 'patient'), getDoctorProfile);
router.get('/:doctorId/available-slots', authenticate, authorize('admin', 'doctor', 'patient'), getDoctorAvailableSlots);

module.exports = router;
