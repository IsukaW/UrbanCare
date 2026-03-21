const express = require('express');
const {
  createAppointment,
  getAppointmentById,
  updateAppointmentById,
  deleteAppointmentById
} = require('../controllers/appointmentController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.post('/', authenticate, authorize('admin', 'doctor', 'patient'), createAppointment);
router.get('/:id', authenticate, authorize('admin', 'doctor', 'patient'), getAppointmentById);
router.patch('/:id', authenticate, authorize('admin', 'doctor', 'patient'), updateAppointmentById);
router.delete('/:id', authenticate, authorize('admin', 'doctor', 'patient'), deleteAppointmentById);

module.exports = router;
