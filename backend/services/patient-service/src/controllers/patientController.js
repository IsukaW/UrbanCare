const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');
const Patient = require('../models/Patient');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');

const createSchema = Joi.object({
  userId: Joi.string().required(),
  fullName: Joi.string().min(2).max(120).required(),
  dateOfBirth: Joi.date().iso().required(),
  bloodType: Joi.string().max(4).optional(),
  allergies: Joi.array().items(Joi.string().max(120)).optional()
});

const historySchema = Joi.object({
  diagnosis: Joi.string().min(2).max(200).required(),
  treatment: Joi.string().max(400).allow('').optional(),
  notes: Joi.string().max(800).allow('').optional()
});

const createPatient = asyncHandler(async (req, res) => {
  const { error, value } = createSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  if (req.user.role === 'patient' && req.user.id !== value.userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Patients can only register their own profile');
  }

  const existing = await Patient.findOne({ userId: value.userId });
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'Patient profile already exists for this user');
  }

  const patient = await Patient.create(value);
  return res.status(StatusCodes.CREATED).json(patient);
});

const getPatientById = asyncHandler(async (req, res) => {
  // The route param is the auth user's ID (userId), not the patient document's _id.
  // findOne by userId so the frontend can call GET /patients/:authUserId.
  const patient = await Patient.findOne({ userId: req.params.id });
  if (!patient) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Patient not found');
  }

  if (req.user.role === 'patient' && req.user.id !== patient.userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Patients can only view their own profile');
  }

  return res.status(StatusCodes.OK).json(patient);
});

const updatePatientHistory = asyncHandler(async (req, res) => {
  const { error, value } = historySchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const patient = await Patient.findById(req.params.id);
  if (!patient) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Patient not found');
  }

  if (req.user.role === 'patient') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Patients cannot modify medical history');
  }

  patient.medicalHistory.push(value);
  await patient.save();

  return res.status(StatusCodes.OK).json(patient);
});

module.exports = {
  createPatient,
  getPatientById,
  updatePatientHistory
};
