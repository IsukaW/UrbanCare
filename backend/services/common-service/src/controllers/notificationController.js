const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendEmail, sendSms } = require('../services/notificationService');

const emailSchema = Joi.object({
  to: Joi.string().email().required(),
  subject: Joi.string().min(1).max(150).required(),
  text: Joi.string().allow('').optional(),
  html: Joi.string().allow('').optional()
});

const smsSchema = Joi.object({
  to: Joi.string().required(),
  body: Joi.string().min(1).max(500).required()
});

const sendEmailNotification = asyncHandler(async (req, res) => {
  const { error, value } = emailSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  await sendEmail(value);
  return res.status(StatusCodes.OK).json({ message: 'Email sent successfully' });
});

const sendSmsNotification = asyncHandler(async (req, res) => {
  const { error, value } = smsSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  await sendSms(value);
  return res.status(StatusCodes.OK).json({ message: 'SMS sent successfully' });
});

module.exports = { sendEmailNotification, sendSmsNotification };
