const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    qualifications: { type: [String], default: [] },
    yearsOfExperience: { type: Number, min: 0, default: 0 },
    // document _id from common-service, set when the doctor uploads a photo
    profilePhotoDocumentId: { type: String, default: null }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;
