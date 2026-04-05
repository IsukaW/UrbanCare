const Joi = require('joi');
const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');
const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');
const { uploadDoctorDocument } = require('../services/documentService');
const {
  attachWeeklyToDoctorLean,
  attachWeeklyToDoctorsLean,
  getWeeklyAvailabilityForDoctorId,
  saveWeekSlots,
  deleteByDoctorId
} = require('../services/doctorScheduleService');

/** Doctor may be addressed by internal userId (User._id) or by Doctor document _id (e.g. appointments use _id). */
const doctorMatchesActor = (actorId, doctorDoc) =>
  doctorDoc.userId === actorId || doctorDoc._id.toString() === actorId;

const createSchema = Joi.object({
  userId: Joi.string().trim().allow('', null).optional(),
  fullName: Joi.string().min(2).max(120).required(),
  specialization: Joi.string().min(2).max(100).required(),
  qualifications: Joi.array().items(Joi.string().min(2).max(120)).optional(),
  yearsOfExperience: Joi.number().min(0).max(80).optional()
});

const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(2).max(120),
  specialization: Joi.string().min(2).max(100),
  qualifications: Joi.array().items(Joi.string().min(2).max(120)),
  yearsOfExperience: Joi.number().min(0).max(80)
})
  .min(1)
  .messages({
    'object.min': 'At least one field is required to update'
  });

const slotItemSchema = Joi.object({
  dayOfWeek: Joi.number().integer().min(0).max(6).required(),
  startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
  endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required()
});

const scheduleSchema = Joi.object({
  weekStartMonday: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({ 'string.pattern.base': 'weekStartMonday must be YYYY-MM-DD (Monday of the week)' }),
  schedule: Joi.array().items(slotItemSchema).required()
});

const createDoctor = asyncHandler(async (req, res) => {
  const { error, value } = createSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  if (!value.userId?.trim()) {
    value.userId =
      req.user.role === 'doctor'
        ? req.user.id
        : new mongoose.Types.ObjectId().toString();
  }

  if (req.user.role === 'doctor' && req.user.id !== value.userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Doctors can only create their own profile');
  }

  const existing = await Doctor.findOne({ userId: value.userId });
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'Doctor profile already exists for this user');
  }

  const createPayload = { ...value };

  const doctor = await Doctor.create(createPayload);
  const lean = await Doctor.findById(doctor._id).lean();
  return res.status(StatusCodes.CREATED).json(await attachWeeklyToDoctorLean(lean));
});

const listDoctors = asyncHandler(async (_req, res) => {
  const doctors = await Doctor.find({}).sort({ fullName: 1 }).lean();
  return res.status(StatusCodes.OK).json(await attachWeeklyToDoctorsLean(doctors));
});

const getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id).lean();
  if (!doctor) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Doctor not found');
  }

  return res.status(StatusCodes.OK).json(await attachWeeklyToDoctorLean(doctor));
});

const getDoctorSchedule = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id).lean();
  if (!doctor) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Doctor not found');
  }

  const weeklyAvailability = await getWeeklyAvailabilityForDoctorId(doctor._id);
  return res.status(StatusCodes.OK).json({
    doctorId: doctor._id.toString(),
    weeklyAvailability
  });
});

const updateDoctor = asyncHandler(async (req, res) => {
  const { error, value } = updateProfileSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Doctor not found');
  }

  if (req.user.role === 'doctor' && !doctorMatchesActor(req.user.id, doctor)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Doctors can only update their own profile');
  }

  const { ...rest } = value;
  Object.assign(doctor, rest);
  await doctor.save();

  const updated = await Doctor.findById(doctor._id).lean();
  return res.status(StatusCodes.OK).json(await attachWeeklyToDoctorLean(updated));
});

const uploadProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'A profile photo image file is required');
  }

  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Doctor not found');
  }

  if (req.user.role === 'doctor' && !doctorMatchesActor(req.user.id, doctor)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Doctors can only upload their own profile photo');
  }

  let doc;
  try {
    doc = await uploadDoctorDocument({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      linkedDoctorId: doctor._id.toString(),
      description: `Profile photo for doctor ${doctor._id}`,
      authorization: req.headers.authorization
    });
  } catch (err) {
    throw new ApiError(StatusCodes.BAD_GATEWAY, `Failed to upload photo to document store: ${err.message}`);
  }

  doctor.profilePhotoDocumentId = doc._id;
  await doctor.save();

  return res.status(StatusCodes.OK).json({
    profilePhotoDocumentId: doctor.profilePhotoDocumentId,
    documentId: doc._id,
    message: 'Profile photo uploaded successfully'
  });
});

const deleteDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findByIdAndDelete(req.params.id);
  if (!doctor) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Doctor not found');
  }
  await deleteByDoctorId(doctor._id);
  return res.status(StatusCodes.NO_CONTENT).send();
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

  if (req.user.role === 'doctor' && !doctorMatchesActor(req.user.id, doctor)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Doctors can only update their own schedule');
  }

  const { weekStartMonday, schedule: weekSlots } = value;

  await saveWeekSlots(doctor._id, weekStartMonday, weekSlots);

  const doctorLean = await Doctor.findById(doctor._id).lean();
  return res.status(StatusCodes.OK).json(await attachWeeklyToDoctorLean(doctorLean));
});

module.exports = {
  createDoctor,
  listDoctors,
  getDoctorById,
  getDoctorSchedule,
  updateDoctor,
  deleteDoctor,
  updateDoctorSchedule,
  uploadProfilePhoto
};
