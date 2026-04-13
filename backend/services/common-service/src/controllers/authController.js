const crypto = require('crypto');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { StatusCodes } = require('http-status-codes');
const User = require('../models/User');
const PasswordResetOtp = require('../models/PasswordResetOtp');
const ApiError = require('../utils/ApiError');
const { env } = require('../config/env');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendEmail } = require('../services/notificationService');
const logger = require('../config/logger');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(64).required(),
  firstName: Joi.string().min(2).max(60).required(),
  lastName: Joi.string().min(2).max(60).required(),
  role: Joi.string().valid('admin', 'doctor', 'patient').required(),
  phoneNumber: Joi.string().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const issueToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

const register = asyncHandler(async (req, res) => {
  const { error, value } = registerSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const existing = await User.findOne({ email: value.email.toLowerCase() });
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'Email is already registered');
  }

  const passwordHash = await bcrypt.hash(value.password, 12);
  const firstName = value.firstName.trim();
  const lastName = value.lastName.trim();
  // Doctors and patients start as pending until an admin approves them
  const status = value.role === 'admin' ? 'approved' : 'pending';
  const user = await User.create({
    email: value.email.toLowerCase(),
    passwordHash,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    role: value.role,
    status,
    phoneNumber: value.phoneNumber
  });

  return res.status(StatusCodes.CREATED).json({
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      phoneNumber: user.phoneNumber
    },
    message:
      status === 'pending'
        ? 'Registration successful. Your account is pending admin approval.'
        : 'Registration successful.'
  });
});

const login = asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const user = await User.findOne({ email: value.email.toLowerCase() });
  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid email or password');
  }

  const isMatch = await bcrypt.compare(value.password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid email or password');
  }

  if (user.status === 'pending') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Your account is pending admin approval. You will receive an email once approved.');
  }

  if (user.status === 'rejected') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Your account registration has been rejected. Please contact support.');
  }

  const token = issueToken(user);

  return res.status(StatusCodes.OK).json({
    token,
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      phoneNumber: user.phoneNumber
    }
  });
});

// ─── Password Reset helpers ───────────────────────────────────────────────────

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RESET_TOKEN_TTL = '10m';     // JWT used to authorise the final reset step

/** Generate a cryptographically random 6-digit OTP string */
const generateOtp = () => String(crypto.randomInt(100000, 999999));

/** Issue a short-lived JWT that only authorises the reset-password endpoint */
const issueResetToken = (email) =>
  jwt.sign({ email, purpose: 'password_reset' }, env.JWT_SECRET, { expiresIn: RESET_TOKEN_TTL });

// ─── Schema definitions ───────────────────────────────────────────────────────

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const verifyCodeSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().length(6).pattern(/^\d+$/).required()
});

const resetPasswordSchema = Joi.object({
  resetToken: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .max(64)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/)
    .required()
    .messages({
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
    })
});

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /auth/forgot-password
 * If the email exists, generate an OTP and send it. Always returns 200
 * (even for unknown emails) to prevent user enumeration.
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { error, value } = forgotPasswordSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const email = value.email.toLowerCase();
  const user = await User.findOne({ email });

  if (user) {
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    // Invalidate any existing OTPs for this email before creating a new one
    await PasswordResetOtp.deleteMany({ email });

    await PasswordResetOtp.create({ email, otpHash, expiresAt });

    try {
      await sendEmail({
        to: email,
        subject: 'UrbanCare Password Reset Code',
        text: `Hi ${user.firstName},\n\nYour password reset code is: ${otp}\nThis code will expire in 5 minutes.\n\nIf you did not request this, please ignore this email.\n\nUrbanCare Team`,
        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>UrbanCare – Password Reset</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4ff;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1d4ed8 0%,#3b82f6 100%);padding:36px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);border-radius:14px;padding:12px 20px;">
                    <span style="color:#ffffff;font-size:26px;font-weight:800;letter-spacing:1px;">UrbanCare</span>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:rgba(255,255,255,0.85);font-size:15px;font-weight:400;">Password Reset Request</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1e293b;">Hi ${user.firstName},</p>
              <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6;">
                We received a request to reset your UrbanCare password. Use the verification code below to continue. This code is valid for <strong style="color:#1d4ed8;">5 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center" style="background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border:2px dashed #93c5fd;border-radius:12px;padding:28px 20px;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#3b82f6;letter-spacing:2px;text-transform:uppercase;">Your Reset Code</p>
                    <p style="margin:0;font-size:44px;font-weight:800;letter-spacing:14px;color:#1d4ed8;font-variant-numeric:tabular-nums;">${otp}</p>
                  </td>
                </tr>
              </table>

              <!-- Timer note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#fefce8;border-left:4px solid #facc15;border-radius:0 8px 8px 0;padding:12px 16px;">
                    <p style="margin:0;font-size:13px;color:#854d0e;">
                      ⏱ &nbsp;This code expires in <strong>5 minutes</strong>. Do not share it with anyone.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:14px;color:#64748b;line-height:1.6;">
                If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;text-align:center;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#1d4ed8;">UrbanCare Team</p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">Secure Healthcare, Simplified.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
      });

      logger.info({ email }, 'Password reset OTP sent');
    } catch (emailErr) {
      // Roll back the OTP record if the email failed to send
      await PasswordResetOtp.deleteMany({ email });
      logger.error({ email, err: emailErr.message }, 'Failed to send password reset email');
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to send reset email. Please try again.');
    }
  }

  // Always respond generically to prevent user enumeration
  return res.status(StatusCodes.OK).json({
    message: 'If that email is registered, a reset code has been sent.'
  });
});

/**
 * POST /auth/verify-code
 * Validate the OTP. On success return a short-lived reset token that the
 * client must send to /auth/reset-password.
 */
const verifyResetCode = asyncHandler(async (req, res) => {
  const { error, value } = verifyCodeSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const email = value.email.toLowerCase();
  const record = await PasswordResetOtp.findOne({ email, usedAt: null }).sort({ createdAt: -1 });

  if (!record) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid or expired code');
  }

  if (Date.now() > record.expiresAt.getTime()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Code has expired');
  }

  const isMatch = await bcrypt.compare(value.code, record.otpHash);
  if (!isMatch) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid code');
  }

  // Mark the OTP as used so it cannot be replayed
  record.usedAt = new Date();
  await record.save();

  const resetToken = issueResetToken(email);
  logger.info({ email }, 'OTP verified, reset token issued');

  return res.status(StatusCodes.OK).json({ resetToken });
});

/**
 * POST /auth/reset-password
 * Verify the reset token (issued by /auth/verify-code) and update the password.
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { error, value } = resetPasswordSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  let payload;
  try {
    payload = jwt.verify(value.resetToken, env.JWT_SECRET);
  } catch {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Reset link is invalid or has expired');
  }

  if (payload.purpose !== 'password_reset') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid reset token');
  }

  const user = await User.findOne({ email: payload.email });
  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User not found');
  }

  user.passwordHash = await bcrypt.hash(value.newPassword, 12);
  await user.save();

  // Clean up any remaining OTPs for this email
  await PasswordResetOtp.deleteMany({ email: payload.email });

  logger.info({ email: payload.email }, 'Password reset successfully');

  return res.status(StatusCodes.OK).json({ message: 'Password updated successfully. Please log in.' });
});

module.exports = { register, login, forgotPassword, verifyResetCode, resetPassword };
