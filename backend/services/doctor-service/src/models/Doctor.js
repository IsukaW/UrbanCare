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
    username: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
      index: true
    },
    password: { type: String, select: false },
    fullName: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    qualifications: { type: [String], default: [] },
    yearsOfExperience: { type: Number, min: 0, default: 0 },
    /** @deprecated Use weeklyAvailability — kept for legacy clients */
    schedule: { type: [scheduleSlotSchema], default: [] },
    /** One entry per calendar week (Monday YYYY-MM-DD); slots apply only to that week */
    weeklyAvailability: {
      type: [
        {
          weekStartMonday: { type: String, required: true, trim: true },
          slots: { type: [scheduleSlotSchema], default: [] }
        }
      ],
      default: []
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        return ret;
      }
    }
  }
);

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;
