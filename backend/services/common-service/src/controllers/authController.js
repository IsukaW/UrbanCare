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
  fullName: Joi.string().min(2).max(120).required(),
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
  const user = await User.create({
    email: value.email.toLowerCase(),
    passwordHash,
    fullName: value.fullName,
    role: value.role,
    phoneNumber: value.phoneNumber
  });

  const token = issueToken(user);

  return res.status(StatusCodes.CREATED).json({
    user: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phoneNumber: user.phoneNumber
    },
    token
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

  const token = issueToken(user);

  return res.status(StatusCodes.OK).json({
    token,
    user: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phoneNumber: user.phoneNumber
    }
  });
});

module.exports = { register, login };
