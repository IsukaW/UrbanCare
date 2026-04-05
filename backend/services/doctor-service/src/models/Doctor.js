const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    qualifications: { type: [String], default: [] },
    yearsOfExperience: { type: Number, min: 0, default: 0 },
    /** Document _id from common-service — set after the doctor uploads a profile photo */
    profilePhotoDocumentId: { type: String, default: null }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;
