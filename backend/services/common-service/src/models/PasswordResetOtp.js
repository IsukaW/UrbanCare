const mongoose = require('mongoose');

const passwordResetOtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Automatically remove documents 1 hour after they expire
passwordResetOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

const PasswordResetOtp = mongoose.model('PasswordResetOtp', passwordResetOtpSchema);

module.exports = PasswordResetOtp;
