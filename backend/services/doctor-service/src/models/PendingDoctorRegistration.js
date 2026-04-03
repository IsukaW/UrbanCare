const mongoose = require('mongoose');

const certificateFileSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedRelativePath: { type: String, required: true },
    mimeType: { type: String, default: 'application/pdf' }
  },
  { _id: false }
);

const pendingDoctorRegistrationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    fullName: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    qualifications: { type: [String], default: [] },
    yearsOfExperience: { type: Number, min: 0, default: 0 },
    certificates: { type: [certificateFileSchema], default: [] },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    rejectionReason: { type: String, trim: true, default: '' },
    reviewedAt: { type: Date, default: null }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('PendingDoctorRegistration', pendingDoctorRegistrationSchema);
