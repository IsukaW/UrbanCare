const Joi = require('joi');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');
const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');
const { env } = require('../config/env');

/** Doctor may be addressed by internal userId (User._id) or by Doctor document _id (e.g. appointments use _id). */
const doctorMatchesActor = (actorId, doctorDoc) =>
  doctorDoc.userId === actorId || doctorDoc._id.toString() === actorId;

const BCRYPT_ROUNDS = 10;

const createSchema = Joi.object({
  userId: Joi.string().trim().allow('', null).optional(),
  username: Joi.string().trim().email().max(254).optional(),
  password: Joi.string().min(8).max(128).optional(),
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

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required()
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

  const { username, password, ...rest } = value;
  const createPayload = { ...rest };

  if (req.user.role === 'admin') {
    if (!username?.trim() || !password) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email and password are required');
    }
    const normalizedUsername = username.trim().toLowerCase();
    const usernameTaken = await Doctor.findOne({ username: normalizedUsername });
    if (usernameTaken) {
      throw new ApiError(StatusCodes.CONFLICT, 'This email is already registered');
    }
    createPayload.username = normalizedUsername;
    createPayload.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
  } else if (username?.trim() || password) {
    if (!username?.trim() || !password) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email and password must both be provided together');
    }
    const normalizedUsername = username.trim().toLowerCase();
    const usernameTaken = await Doctor.findOne({ username: normalizedUsername });
    if (usernameTaken) {
      throw new ApiError(StatusCodes.CONFLICT, 'This email is already registered');
    }
    createPayload.username = normalizedUsername;
    createPayload.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  const doctor = await Doctor.create(createPayload);
  return res.status(StatusCodes.CREATED).json(doctor);
});

const loginDoctor = asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const email = value.email.toLowerCase();
  const doctor = await Doctor.findOne({ username: email }).select('+password');
  if (!doctor?.password) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid email or password');
  }

  const ok = await bcrypt.compare(value.password, doctor.password);
  if (!ok) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid email or password');
  }

  const sub = doctor._id.toString();
  const token = jwt.sign({ sub, email: doctor.username, role: 'doctor' }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });

  const parts = doctor.fullName.trim().split(/\s+/);
  const firstName = parts[0] || 'Doctor';
  const lastName = parts.slice(1).join(' ').trim() || firstName;

  return res.status(StatusCodes.OK).json({
    token,
    user: {
      id: sub,
      _id: sub,
      email: doctor.username,
      firstName,
      lastName,
      fullName: doctor.fullName,
      role: 'doctor'
    }
  });
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

  Object.assign(doctor, value);
  await doctor.save();

  return res.status(StatusCodes.OK).json(doctor);
});

const deleteDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findByIdAndDelete(req.params.id);
  if (!doctor) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Doctor not found');
  }
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

  if (!doctor.weeklyAvailability?.length && doctor.schedule?.length) {
    const d = new Date();
    const day = d.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    mon.setDate(mon.getDate() + offset);
    mon.setHours(0, 0, 0, 0);
    const y = mon.getFullYear();
    const m = String(mon.getMonth() + 1).padStart(2, '0');
    const dd = String(mon.getDate()).padStart(2, '0');
    const curKey = `${y}-${m}-${dd}`;
    doctor.weeklyAvailability = [{ weekStartMonday: curKey, slots: [...doctor.schedule] }];
    doctor.schedule = [];
  }

  const list = [...(doctor.weeklyAvailability || [])];
  const idx = list.findIndex((w) => w.weekStartMonday === weekStartMonday);
  const entry = { weekStartMonday, slots: weekSlots };
  if (idx >= 0) {
    list[idx] = entry;
  } else {
    list.push(entry);
  }
  doctor.weeklyAvailability = list;
  doctor.markModified('weeklyAvailability');
  await doctor.save();

  return res.status(StatusCodes.OK).json(doctor);
});

module.exports = {
  createDoctor,
  loginDoctor,
  listDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  updateDoctorSchedule
};
