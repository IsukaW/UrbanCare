const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');
const Patient = require('../models/Patient');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');
const documentService = require('../services/MedicalReportService');

const VALID_CATEGORIES = [
  'prescription',
  'lab_report',
  'medical_record',
  'certificate',
  'imaging',
  'other'
];

const uploadSchema = Joi.object({
  category: Joi.string().valid(...VALID_CATEGORIES).default('other'),
  description: Joi.string().max(500).allow('').optional(),
  appointmentId: Joi.string().optional(),
  visibleTo: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string()),
      Joi.string()
    )
    .optional()
});

const listQuerySchema = Joi.object({
  category: Joi.string().valid(...VALID_CATEGORIES).optional(),
  appointmentId: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

const resolvePatient = async (patientId, user) => {
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Patient not found');
  }
  if (user.role === 'patient' && user.id !== patient.userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied');
  }
  return patient;
};

const extractToken = (req) => req.headers.authorization.split(' ')[1];

const uploadDocuments = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'At least one file is required');
  }

  const rawMeta = { ...req.body };
  if (typeof rawMeta.visibleTo === 'string') {
    try {
      rawMeta.visibleTo = JSON.parse(rawMeta.visibleTo);
    } catch {
      rawMeta.visibleTo = rawMeta.visibleTo.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  const { error, value } = uploadSchema.validate(rawMeta, {
    abortEarly: false,
    stripUnknown: true
  });
  if (error) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      error.details.map((d) => d.message).join(', ')
    );
  }

  await resolvePatient(req.params.patientId, req.user);

  const docs = await documentService.uploadDocuments(req.files, value, extractToken(req));

  return res.status(StatusCodes.CREATED).json(docs);
});

const listDocuments = asyncHandler(async (req, res) => {
  await resolvePatient(req.params.patientId, req.user);

  const { error, value } = listQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });
  if (error) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      error.details.map((d) => d.message).join(', ')
    );
  }

  const result = await documentService.listDocuments(value, extractToken(req));

  return res.status(StatusCodes.OK).json(result);
});


const getDocument = asyncHandler(async (req, res) => {
  await resolvePatient(req.params.patientId, req.user);

  const { data, headers } = await documentService.getDocument(
    req.params.documentId,
    extractToken(req)
  );

  res.setHeader('Content-Type', headers['content-type']);
  res.setHeader('Content-Disposition', headers['content-disposition']);
  res.setHeader('Content-Length', headers['content-length']);
  return res.end(Buffer.from(data));
});

const downloadDocument = asyncHandler(async (req, res) => {
  await resolvePatient(req.params.patientId, req.user);

  const { data, headers } = await documentService.downloadDocument(
    req.params.documentId,
    extractToken(req)
  );

  res.setHeader('Content-Type', headers['content-type']);
  res.setHeader('Content-Disposition', headers['content-disposition']);
  res.setHeader('Content-Length', headers['content-length']);
  return res.end(Buffer.from(data));
});

const deleteDocument = asyncHandler(async (req, res) => {
  await resolvePatient(req.params.patientId, req.user);

  await documentService.deleteDocument(req.params.documentId, extractToken(req));

  return res.status(StatusCodes.NO_CONTENT).send();
});

module.exports = {
  uploadDocuments,
  listDocuments,
  getDocument,
  downloadDocument,
  deleteDocument
};