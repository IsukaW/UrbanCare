const express = require('express');
const {
  createAppointment,
  listMyAppointments,
  getAppointment,
  cancelAppointment
} = require('../controllers/appointmentController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();


router.post('/', authenticate, authorize('admin', 'patient'), createAppointment);
router.get('/', authenticate, authorize('admin', 'doctor', 'patient'), listMyAppointments);
router.get('/:id', authenticate, authorize('admin', 'doctor', 'patient'), getAppointment);
router.post('/:id/cancel', authenticate, authorize('admin', 'patient'), cancelAppointment);

module.exports = router;
