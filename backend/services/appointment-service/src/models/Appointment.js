const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    doctorId: { type: String, required: true, index: true },
    scheduledAt: { type: Date, required: true, index: true },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true
    },
    createdBy: { type: String, required: true }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
