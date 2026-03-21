const mongoose = require('mongoose');

const scheduleSlotSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true }
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    qualifications: { type: [String], default: [] },
    yearsOfExperience: { type: Number, min: 0, default: 0 },
    schedule: { type: [scheduleSlotSchema], default: [] }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;
