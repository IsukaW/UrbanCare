const mongoose = require('mongoose');

const medicalHistoryEntrySchema = new mongoose.Schema(
  {
    diagnosis: { type: String, required: true },
    treatment: { type: String },
    notes: { type: String },
    recordedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const patientSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    bloodType: { type: String, trim: true },
    allergies: { type: [String], default: [] },
    medicalHistory: { type: [medicalHistoryEntrySchema], default: [] }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
