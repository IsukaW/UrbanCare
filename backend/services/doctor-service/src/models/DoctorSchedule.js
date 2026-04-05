const mongoose = require('mongoose');

const scheduleSlotSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true }
  },
  { _id: false }
);

const weekEntrySchema = new mongoose.Schema(
  {
    weekStartMonday: { type: String, required: true, trim: true },
    slots: { type: [scheduleSlotSchema], default: [] }
  },
  { _id: false }
);

const doctorScheduleSchema = new mongoose.Schema(
  {
    /** Doctor profile document _id (one schedule document per doctor) */
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      unique: true,
      index: true
    },
    /** One entry per calendar week (Monday YYYY-MM-DD); slots apply only to that week */
    weeklyAvailability: {
      type: [weekEntrySchema],
      default: []
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const DoctorSchedule = mongoose.model('DoctorSchedule', doctorScheduleSchema);

module.exports = DoctorSchedule;
