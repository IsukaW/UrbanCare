const express = require('express');
const {
  searchDoctors,
  bookAppointment,
  listAppointments,
  getAppointmentById,
  getAppointmentStatus,
  updateAppointment,
  requestCancellation,
  approveCancellation,
  offerReschedule,
  confirmReschedule,
  handlePaymentWebhook
} = require('../controllers/appointmentController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// Search for available doctors
router.get('/search', authenticate, authorize('admin', 'doctor', 'patient'), searchDoctors);

// Book appointment
router.post('/', authenticate, authorize('admin', 'doctor', 'patient'), bookAppointment);

// List appointments with filters
router.get('/', authenticate, authorize('admin', 'doctor', 'patient'), listAppointments);

// Get appointment by ID
router.get('/:id', authenticate, authorize('admin', 'doctor', 'patient'), getAppointmentById);

// Get appointment status
router.get('/:id/status', authenticate, authorize('admin', 'doctor', 'patient'), getAppointmentStatus);

// Update appointment (modify date/slot/time)
router.put('/:id', authenticate, authorize('admin', 'doctor', 'patient'), updateAppointment);

// Patient request cancellation
router.post('/:id/request-cancellation', authenticate, authorize('admin', 'patient'), requestCancellation);

// Admin approve/reject cancellation
router.put('/:id/approve-cancellation', authenticate, authorize('admin'), approveCancellation);

// Admin offer reschedule 
router.post('/:id/offer-reschedule', authenticate, authorize('admin'), offerReschedule);

// Patient confirm reschedule
router.put('/:id/confirm-reschedule', authenticate, authorize('admin', 'patient'), confirmReschedule);

// Payment webhook (called by common/payment service) - no auth expected from internal service
router.post('/payments/webhook', handlePaymentWebhook);

module.exports = router;
