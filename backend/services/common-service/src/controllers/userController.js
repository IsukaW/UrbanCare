const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendEmail } = require('../services/notificationService');
const logger = require('../config/logger');

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

  return res.status(StatusCodes.OK).json({
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    phoneNumber: user.phoneNumber
  });
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
    status: user.status,
    phoneNumber: user.phoneNumber
  });
});

const rejectUserSchema = Joi.object({
  message: Joi.string().min(10).max(2000).required()
});

const buildApprovalEmail = (user) => {
  if (user.role === 'doctor') {
    return {
      subject: 'Your UrbanCare Doctor Account Has Been Approved',
      text: [
        `Dear Dr. ${user.firstName} ${user.lastName},`,
        '',
        'Congratulations! We are pleased to inform you that your UrbanCare doctor account has been successfully reviewed and approved by our administration team.',
        '',
        'You can now log in to the UrbanCare platform and:',
        '  • Set up and manage your professional profile',
        '  • Configure your availability schedule',
        '  • Accept and manage patient appointments',
        '  • Conduct in-person and video consultations',
        '  • Access patient medical records shared with you',
        '',
        'To get started, please log in at your earliest convenience and complete your doctor profile so patients can find and book appointments with you.',
        '',
        'If you have any questions or need assistance, please do not hesitate to contact our support team.',
        '',
        'Welcome to UrbanCare — we look forward to working with you!',
        '',
        'Warm regards,',
        'The UrbanCare Administration Team'
      ].join('\n')
    };
  }

  // patient
  return {
    subject: 'Your UrbanCare Patient Account Has Been Approved',
    text: [
      `Dear ${user.firstName} ${user.lastName},`,
      '',
      'Great news! Your UrbanCare patient account has been reviewed and approved by our administration team.',
      '',
      'You now have full access to the UrbanCare platform where you can:',
      '  • Search and browse qualified doctors by specialty',
      '  • Book in-person or video appointments at your convenience',
      '  • View and manage your upcoming appointments',
      '  • Upload and share medical reports with your doctor',
      '  • Access your medical history and consultation records',
      '',
      'To get started, simply log in to your account and explore the available doctors. Booking your first appointment is quick and easy.',
      '',
      'If you have any questions or require assistance, our support team is always here to help.',
      '',
      'Welcome to UrbanCare — your health is our priority!',
      '',
      'Warm regards,',
      'The UrbanCare Administration Team'
    ].join('\n')
  };
};

const getAllUsers = asyncHandler(async (req, res) => {
  const { role, status } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;

  const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 });
  return res.status(StatusCodes.OK).json(users);
});

const approveUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  if (!['doctor', 'patient'].includes(user.role)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Only doctor and patient accounts require approval');
  }

  if (user.status === 'approved') {
    throw new ApiError(StatusCodes.CONFLICT, 'User account is already approved');
  }

  user.status = 'approved';
  await user.save();

  const { subject, text } = buildApprovalEmail(user);

  try {
    await sendEmail({
      to: user.email,
      subject,
      text,
      html: `<p>${text.replace(/\n/g, '<br>')}</p>`
    });
  } catch (err) {
    logger.warn({ err, userId: user._id }, 'Approval email could not be sent');
  }

  return res.status(StatusCodes.OK).json({
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    phoneNumber: user.phoneNumber
  });
});

const rejectUser = asyncHandler(async (req, res) => {
  const { error, value } = rejectUserSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  if (!['doctor', 'patient'].includes(user.role)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Only doctor and patient accounts require approval');
  }

  if (user.status === 'rejected') {
    throw new ApiError(StatusCodes.CONFLICT, 'User account is already rejected');
  }

  user.status = 'rejected';
  await user.save();

  const fullMessage = [
    `Dear ${user.firstName} ${user.lastName},`,
    '',
    value.message.trim(),
    '',
    'If you believe this decision was made in error or you have additional information to provide, please contact our support team.',
    '',
    'Regards,',
    'The UrbanCare Administration Team'
  ].join('\n');

  try {
    await sendEmail({
      to: user.email,
      subject: 'Update on Your UrbanCare Account Registration',
      text: fullMessage,
      html: `<p>${fullMessage.replace(/\n/g, '<br>')}</p>`
    });
  } catch (err) {
    logger.warn({ err, userId: user._id }, 'Rejection email could not be sent');
  }

  return res.status(StatusCodes.OK).json({
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    phoneNumber: user.phoneNumber
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  if (req.user.id === user._id.toString()) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You cannot delete your own account');
  }

  await user.deleteOne();
  return res.status(StatusCodes.OK).json({ message: 'User deleted successfully' });
});

module.exports = { getUserById, updateUserById, getAllUsers, approveUser, rejectUser, deleteUser };
