const Joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { StatusCodes } = require('http-status-codes');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { env } = require('../config/env');
const { asyncHandler } = require('../utils/asyncHandler');

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

module.exports = { register, login };
