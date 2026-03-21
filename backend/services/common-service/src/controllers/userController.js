const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');

const updateSchema = Joi.object({
  firstName: Joi.string().min(2).max(60).optional(),
  lastName: Joi.string().min(2).max(60).optional(),
  phoneNumber: Joi.string().allow('', null).optional()
}).min(1);

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash');
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  if (req.user.role !== 'admin' && req.user.id !== user._id.toString()) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You can only view your own profile');
  }

  return res.status(StatusCodes.OK).json(user);
});

const updateUserById = asyncHandler(async (req, res) => {
  const { error, value } = updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  if (req.user.role !== 'admin' && req.user.id !== user._id.toString()) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You can only update your own profile');
  }

  if (value.firstName !== undefined) {
    user.firstName = value.firstName.trim();
  }

  if (value.lastName !== undefined) {
    user.lastName = value.lastName.trim();
  }

  if (value.phoneNumber !== undefined) {
    user.phoneNumber = value.phoneNumber;
  }

  user.fullName = `${user.firstName} ${user.lastName}`.trim();
  await user.save();

  return res.status(StatusCodes.OK).json({
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    role: user.role,
    phoneNumber: user.phoneNumber
  });
});

module.exports = { getUserById, updateUserById };
