const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');
const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendAppointmentCreatedNotification } = require('../services/notificationClient');

const createSchema = Joi.object({
  patientId: Joi.string().required(),
  doctorId: Joi.string().required(),
  scheduledAt: Joi.date().iso().required(),
  reason: Joi.string().min(3).max(500).required(),
  patientEmail: Joi.string().email().optional(),
  patientPhoneNumber: Joi.string().optional()
});

const updateSchema = Joi.object({
  scheduledAt: Joi.date().iso().optional(),
  reason: Joi.string().min(3).max(500).optional(),
  status: Joi.string().valid('scheduled', 'completed', 'cancelled').optional()
}).min(1);

const canAccessAppointment = (user, appointment) =>
  user.role === 'admin' || user.id === appointment.patientId || user.id === appointment.doctorId;

const createAppointment = asyncHandler(async (req, res) => {
  const { error, value } = createSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  if (req.user.role === 'patient' && req.user.id !== value.patientId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Patients can only create their own appointments');
  }

  if (req.user.role === 'doctor' && req.user.id !== value.doctorId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Doctors can only create appointments for themselves');
  }

  const appointment = await Appointment.create({
    patientId: value.patientId,
    doctorId: value.doctorId,
    scheduledAt: value.scheduledAt,
    reason: value.reason,
    createdBy: req.user.id
  });

  await sendAppointmentCreatedNotification({
    token: req.headers.authorization.split(' ')[1],
    email: value.patientEmail,
    phoneNumber: value.patientPhoneNumber,
    appointmentId: appointment._id.toString(),
    scheduledAt: appointment.scheduledAt.toISOString()
  });

  return res.status(StatusCodes.CREATED).json(appointment);
});

const getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  if (!canAccessAppointment(req.user, appointment)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied for this appointment');
  }

  return res.status(StatusCodes.OK).json(appointment);
});

const updateAppointmentById = asyncHandler(async (req, res) => {
  const { error, value } = updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  if (!canAccessAppointment(req.user, appointment)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied for this appointment');
  }

  Object.assign(appointment, value);
  await appointment.save();

  return res.status(StatusCodes.OK).json(appointment);
});

const deleteAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  if (!canAccessAppointment(req.user, appointment)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied for this appointment');
  }

  appointment.status = 'cancelled';
  await appointment.save();

  return res.status(StatusCodes.NO_CONTENT).send();
});

module.exports = {
  createAppointment,
  getAppointmentById,
  updateAppointmentById,
  deleteAppointmentById
};
