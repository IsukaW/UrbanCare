const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');
const PendingDoctorRegistration = require('../models/PendingDoctorRegistration');
const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendEmailNotification } = require('../services/notifyEmail');

const BCRYPT_ROUNDS = 10;

const registerBodySchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).max(128).required(),
  fullName: Joi.string().min(2).max(120).required(),
  specialization: Joi.string().min(2).max(100).required(),
  qualifications: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional(),
  yearsOfExperience: Joi.alternatives().try(Joi.number(), Joi.string()).optional()
});

const rejectSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(2000).required()
});

function parseQualifications(raw) {
  if (raw == null || raw === '') return [];
  if (Array.isArray(raw)) return raw.map((s) => String(s).trim()).filter(Boolean);
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
}

function parseYears(raw) {
  if (raw === undefined || raw === null || raw === '') return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.min(80, n) : 0;
}

const registerPendingDoctor = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  const { error, value } = registerBodySchema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const email = value.email.toLowerCase();
  const existingDoctor = await Doctor.findOne({ username: email });
  if (existingDoctor) {
    throw new ApiError(StatusCodes.CONFLICT, 'An account with this email already exists');
  }

  const existingPending = await PendingDoctorRegistration.findOne({ email, status: 'pending' });
  if (existingPending) {
    throw new ApiError(StatusCodes.CONFLICT, 'A registration request for this email is already pending');
  }

  const oldRejected = await PendingDoctorRegistration.find({ email, status: 'rejected' });
  for (const doc of oldRejected) {
    for (const c of doc.certificates || []) {
      const abs = path.join(__dirname, '..', '..', c.storedRelativePath.split('/').join(path.sep));
      try {
        fs.unlinkSync(abs);
      } catch (_) {}
    }
    await doc.deleteOne();
  }

  const files = req.files || [];
  if (!files.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'At least one qualification certificate PDF is required');
  }

  const passwordHash = await bcrypt.hash(value.password, BCRYPT_ROUNDS);
  const qualifications = parseQualifications(value.qualifications);
  const yearsOfExperience = parseYears(value.yearsOfExperience);

  const certificates = files.map((f) => ({
    originalName: f.originalname,
    storedRelativePath: path.relative(path.join(__dirname, '..', '..'), f.path).split(path.sep).join('/'),
    mimeType: f.mimetype || 'application/pdf'
  }));

  let pending;
  try {
    pending = await PendingDoctorRegistration.create({
      email,
      passwordHash,
      fullName: value.fullName.trim(),
      specialization: value.specialization.trim(),
      qualifications,
      yearsOfExperience,
      certificates,
      status: 'pending'
    });
  } catch (e) {
    files.forEach((f) => {
      try {
        fs.unlinkSync(f.path);
      } catch (_) {}
    });
    if (e.code === 11000) {
      throw new ApiError(StatusCodes.CONFLICT, 'A registration for this email already exists');
    }
    throw e;
  }

  const out = pending.toObject();
  delete out.passwordHash;
  return res.status(StatusCodes.CREATED).json({
    message: 'Registration submitted. An administrator will review your request.',
    registration: out
  });
});

const listPendingRegistrations = asyncHandler(async (req, res) => {
  const status = req.query.status || 'pending';
  const filter = status === 'all' ? {} : { status };
  const items = await PendingDoctorRegistration.find(filter).sort({ createdAt: -1 }).lean();
  const sanitized = items.map((p) => ({
    _id: p._id,
    email: p.email,
    fullName: p.fullName,
    specialization: p.specialization,
    qualifications: p.qualifications,
    yearsOfExperience: p.yearsOfExperience,
    status: p.status,
    rejectionReason: p.rejectionReason || '',
    createdAt: p.createdAt,
    reviewedAt: p.reviewedAt,
    certificateCount: p.certificates?.length ?? 0,
    certificates: (p.certificates || []).map((c, idx) => ({
      index: idx,
      originalName: c.originalName,
      downloadPath: `/doctors/pending-registrations/${p._id}/certificates/${idx}`
    }))
  }));
  return res.status(StatusCodes.OK).json(sanitized);
});

const getCertificateFile = asyncHandler(async (req, res) => {
  const pending = await PendingDoctorRegistration.findById(req.params.pendingId).lean();
  if (!pending) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Registration not found');
  }

  const idx = Number(req.params.fileIndex);
  const fileMeta = pending.certificates?.[idx];
  if (!fileMeta) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Certificate not found');
  }

  const abs = path.join(__dirname, '..', '..', fileMeta.storedRelativePath.split('/').join(path.sep));
  if (!fs.existsSync(abs)) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Certificate file missing on disk');
  }

  res.setHeader('Content-Type', fileMeta.mimeType || 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileMeta.originalName)}"`);
  return fs.createReadStream(abs).pipe(res);
});

const approvePendingRegistration = asyncHandler(async (req, res) => {
  const pending = await PendingDoctorRegistration.findById(req.params.pendingId).select('+passwordHash');
  if (!pending) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Registration not found');
  }
  if (pending.status !== 'pending') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This request is not pending');
  }

  const email = pending.email;
  const dup = await Doctor.findOne({ username: email });
  if (dup) {
    throw new ApiError(StatusCodes.CONFLICT, 'A doctor profile with this email already exists');
  }

  const userId = new mongoose.Types.ObjectId().toString();
  await Doctor.create({
    userId,
    username: email,
    password: pending.passwordHash,
    fullName: pending.fullName,
    specialization: pending.specialization,
    qualifications: pending.qualifications || [],
    yearsOfExperience: pending.yearsOfExperience ?? 0
  });

  pending.status = 'approved';
  pending.reviewedAt = new Date();
  pending.rejectionReason = '';
  await pending.save();

  const authHeader = req.headers.authorization;
  let emailNotification = 'sent';
  try {
    await sendEmailNotification({
      authorizationHeader: authHeader,
      to: email,
      subject: 'UrbanCare — Doctor registration approved',
      text:
        'Your sign in request has been accepted. Please log in with your provided credentials.'
    });
  } catch (err) {
    emailNotification = 'failed';
    req.log?.warn(
      { err: err?.message || err, pendingId: pending._id?.toString(), to: email },
      'Approve succeeded but email notification failed'
    );
  }

  return res.status(StatusCodes.OK).json({
    message: 'Registration approved and doctor account created.',
    email,
    emailNotification
  });
});

const rejectPendingRegistration = asyncHandler(async (req, res) => {
  const { error, value } = rejectSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const pending = await PendingDoctorRegistration.findById(req.params.pendingId);
  if (!pending) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Registration not found');
  }
  if (pending.status !== 'pending') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This request is not pending');
  }

  pending.status = 'rejected';
  pending.rejectionReason = value.reason.trim();
  pending.reviewedAt = new Date();
  await pending.save();

  const email = pending.email;
  const authHeader = req.headers.authorization;
  const reason = value.reason.trim();
  let emailNotification = 'sent';
  try {
    await sendEmailNotification({
      authorizationHeader: authHeader,
      to: email,
      subject: 'UrbanCare — Doctor registration update',
      text: `Your sign in request has been rejected by system administrator due to '${reason}'.`
    });
  } catch (err) {
    emailNotification = 'failed';
    req.log?.warn(
      { err: err?.message || err, pendingId: pending._id?.toString(), to: email },
      'Reject succeeded but email notification failed'
    );
  }

  return res.status(StatusCodes.OK).json({ message: 'Registration rejected', email, emailNotification });
});

module.exports = {
  registerPendingDoctor,
  listPendingRegistrations,
  getCertificateFile,
  approvePendingRegistration,
  rejectPendingRegistration
};
