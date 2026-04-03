const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');
const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');

const createSchema = Joi.object({
  userId: Joi.string().required(),
  fullName: Joi.string().min(2).max(120).required(),
  specialization: Joi.string().min(2).max(100).required(),
  qualifications: Joi.array().items(Joi.string().min(2).max(120)).optional(),
  yearsOfExperience: Joi.number().min(0).max(80).optional()
});

const scheduleSchema = Joi.object({
  schedule: Joi.array()
    .items(
      Joi.object({
        dayOfWeek: Joi.number().integer().min(0).max(6).required(),
        startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
        endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required()
      })
    )
    .required()
});

const createDoctor = asyncHandler(async (req, res) => {
  const { error, value } = createSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  if (req.user.role === 'doctor' && req.user.id !== value.userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Doctors can only create their own profile');
  }

  const existing = await Doctor.findOne({ userId: value.userId });
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'Doctor profile already exists for this user');
  }

  const doctor = await Doctor.create(value);
  return res.status(StatusCodes.CREATED).json(doctor);
});

const listDoctors = asyncHandler(async (_req, res) => {
  const doctors = await Doctor.find({}).sort({ fullName: 1 });
  return res.status(StatusCodes.OK).json(doctors);
});

const getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Doctor not found');
  }

  return res.status(StatusCodes.OK).json(doctor);
});

const updateDoctorSchedule = asyncHandler(async (req, res) => {
  const { error, value } = scheduleSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Doctor not found');
  }

  if (req.user.role === 'doctor' && req.user.id !== doctor.userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Doctors can only update their own schedule');
  }

  doctor.schedule = value.schedule;
  await doctor.save();

  return res.status(StatusCodes.OK).json(doctor);
});

module.exports = {
  createDoctor,
  listDoctors,
  getDoctorById,
  updateDoctorSchedule
};
