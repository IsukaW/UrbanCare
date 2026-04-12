const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');
const {
  bookAppointment,
  getPatientAppointments,
  getAppointmentById,
  requestCancellation,
  confirmPaymentForAppointment,
  updateAppointment
} = require('../services/appointmentClient');

const bookSchema = Joi.object({
  patientId: Joi.string().required(),
  doctorId: Joi.string().required(),
  slotId: Joi.string().required(),
  type: Joi.string().valid('video', 'in-person').required(),
  reason: Joi.string().min(3).max(500).required(),
  patientEmail: Joi.string().email().optional(),
  patientPhoneNumber: Joi.string().optional(),
  autoPay: Joi.boolean().optional()
});

const cancellationSchema = Joi.object({
  reason: Joi.string().min(3).max(500).required()
});

const createAppointment = asyncHandler(async (req, res) => {
  const { error, value } = bookSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  if (error) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      error.details.map((d) => d.message).join(', ')
    );
  }

  if (req.user.role === 'patient' && req.user.id !== value.patientId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Patients can only book appointments for themselves');
  }

  try {
    const appointment = await bookAppointment({
      body: value,
      authorization: req.headers.authorization
    });
    return res.status(StatusCodes.CREATED).json(appointment);
  } catch (err) {
    const code = err.statusCode || StatusCodes.BAD_GATEWAY;
    throw new ApiError(code, err.message);
  }
});

const listMyAppointments = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;
  let patientId;
  if (req.user.role === 'patient') {
    patientId = req.user.id;
  } else {
    patientId = req.query.patientId;
  }

  if (!patientId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'patientId query parameter is required');
  }

  try {
    const result = await getPatientAppointments({
      patientId,
      status,
      page,
      limit,
      authorization: req.headers.authorization
    });
    return res.status(StatusCodes.OK).json(result);
  } catch (err) {
    const code = err.statusCode || StatusCodes.BAD_GATEWAY;
    throw new ApiError(code, err.message);
  }
});

const getAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const appointment = await getAppointmentById({
      appointmentId: id,
      authorization: req.headers.authorization
    });

    if (req.user.role === 'patient' && req.user.id !== appointment.patientId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied');
    }

    return res.status(StatusCodes.OK).json(appointment);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const code = err.statusCode || StatusCodes.NOT_FOUND;
    throw new ApiError(code, err.message);
  }
});

const cancelAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error, value } = cancellationSchema.validate(req.body, { abortEarly: false });
  if (error) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      error.details.map((d) => d.message).join(', ')
    );
  }

  try {
    const result = await requestCancellation({
      appointmentId: id,
      reason: value.reason,
      authorization: req.headers.authorization
    });
    return res.status(StatusCodes.OK).json(result);
  } catch (err) {
    const code = err.statusCode || StatusCodes.BAD_GATEWAY;
    throw new ApiError(code, err.message);
  }
});

const updateAppt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const result = await updateAppointment({
      appointmentId: id,
      body: req.body,
      authorization: req.headers.authorization
    });
    return res.status(StatusCodes.OK).json(result);
  } catch (err) {
    const code = err.statusCode || StatusCodes.BAD_GATEWAY;
    throw new ApiError(code, err.message);
  }
});

const confirmPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { paymentIntentId } = req.body || {};

  if (!paymentIntentId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'paymentIntentId is required');
  }

  try {
    const result = await confirmPaymentForAppointment({
      appointmentId: id,
      paymentIntentId,
      authorization: req.headers.authorization
    });
    return res.status(StatusCodes.OK).json(result);
  } catch (err) {
    const code = err.statusCode || StatusCodes.BAD_GATEWAY;
    throw new ApiError(code, err.message);
  }
});

module.exports = { createAppointment, listMyAppointments, getAppointment, cancelAppointment, confirmPayment, updateAppt };
