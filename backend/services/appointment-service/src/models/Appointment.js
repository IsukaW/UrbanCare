const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    // Patient Information
    patientId: { type: String, required: true, index: true },
    
    // Doctor Information (stored at booking time)
    doctorId: { type: String, required: true, index: true },
    doctorName: { type: String, required: true },
    doctorSpecialty: { type: String, required: true },
    
    // Appointment Details
    slotId: { type: String, required: true },
    scheduledAt: { type: Date, required: true, index: true },
    tokenNumber: { type: String, optional: true },
    reason: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['video', 'in-person'],
      required: true,
      default: 'in-person'
    },
    
    // Medical Documents (base64)
    medicalReports: [
      {
        fileName: String,
        fileData: String, // base64 encoded
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String
      }
    ],
    
    // Prescription (fetched from common service)
    prescription: {
    issuedAt:  { type: Date },
    doctorSignature: { type: String },
    medications: [{ name: String, dosage: String, instructions: String }],
    notes:     { type: String },
    documentUrl: { type: String }  // from Common Service (document storage)
  },

    // Reference to doctor's existing prescriptions (for context during appointment)
    doctorPrescriptionIds: [{ type: String }],

    // Reference to patient's existing medical documents (for context during appointment)
    patientMedicalDocumentIds: [{ type: String }],

    cancellationReason: { type: String },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
    
    // Cancellation Workflow
    cancellation: {
      requestedBy: String, // patient or admin
      requestedAt: Date,
      reason: String,
      adminNotes: String,
      approvedAt: Date,
      approvedBy: String, // admin id
      // If rescheduled
      alternativeSlotId: String,
      alternativeDate: Date,
      alternativeDoctorId: String
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancellation_requested', 'cancelled', 'rescheduled'],
      default: 'pending',
      index: true
    },
    
    createdBy: { type: String, required: true },
    updatedBy: { type: String }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Index for common queries
appointmentSchema.index({ patientId: 1, status: 1 });
appointmentSchema.index({ doctorId: 1, status: 1 });
appointmentSchema.index({ scheduledAt: 1, status: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
