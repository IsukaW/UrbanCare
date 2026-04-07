const mongoose = require('mongoose');

const scheduleSlotSchema = new mongoose.Schema(
  {
    slotId: {
      type: String,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString()
    },
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    maxTokens: { type: Number, default: 20, min: 1 },
    reservedTokens: { type: Number, default: 0, min: 0 }
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
