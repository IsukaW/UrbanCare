const express = require('express');
const {
  createAppointment,
  listMyAppointments,
  getAppointment,
  cancelAppointment,
  confirmPayment,
  updateAppt
} = require('../controllers/appointmentController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// POST /appointments/book  (alias kept for backward compat)
router.post('/book', authenticate, authorize('admin', 'patient'), createAppointment);

router.post('/', authenticate, authorize('admin', 'patient'), createAppointment);
router.get('/', authenticate, authorize('admin', 'doctor', 'patient'), listMyAppointments);
router.get('/:id', authenticate, authorize('admin', 'doctor', 'patient'), getAppointment);
router.post('/:id/cancel', authenticate, authorize('admin', 'patient'), cancelAppointment);
router.post('/:id/confirm-payment', authenticate, authorize('admin', 'patient'), confirmPayment);
router.put('/:id', authenticate, authorize('admin', 'doctor', 'patient'), updateAppt);

module.exports = router;
