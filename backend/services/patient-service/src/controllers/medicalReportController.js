const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');
const Patient = require('../models/Patient');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');
const {
  uploadPatientDocument,
  listPatientDocuments,
  getPatientDocument,
  downloadPatientDocument,
  deletePatientDocument
} = require('../services/MedicalReportService');

const VALID_CATEGORIES = [
  'prescription',
  'lab_report',
  'medical_record',
  'certificate',
  'imaging',
  'other'
];

// ── Validation schemas ────────────────────────────────────────────────────────

const uploadSchema = Joi.object({
  category: Joi.string().valid(...VALID_CATEGORIES).default('other'),
  description: Joi.string().max(500).allow('').optional(),
  appointmentId: Joi.string().optional()
});

const listQuerySchema = Joi.object({
  category: Joi.string().valid(...VALID_CATEGORIES).optional(),
  appointmentId: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Verify patient exists and requester has access. */
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

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /patients/:patientId/documents
 * Upload one medical document for a patient via common-service.
 */
const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'A file is required');
  }

  const { error, value } = uploadSchema.validate(req.body, {
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

  try {
    const doc = await uploadPatientDocument({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      category: value.category,
      linkedPatientId: req.params.patientId,
      description: value.description || '',
      authorization: req.headers.authorization
    });

    return res.status(StatusCodes.CREATED).json(doc);
  } catch (err) {
    throw new ApiError(StatusCodes.BAD_GATEWAY, err.message);
  }
});

/**
 * GET /patients/:patientId/documents
 * List all documents linked to this patient.
 */
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

  try {
    const result = await listPatientDocuments({
      linkedPatientId: req.params.patientId,
      query: value,
      authorization: req.headers.authorization
    });

    return res.status(StatusCodes.OK).json(result);
  } catch (err) {
    throw new ApiError(StatusCodes.BAD_GATEWAY, err.message);
  }
});

/**
 * GET /patients/:patientId/documents/:documentId
 * View a single document inline in the browser.
 */
const getDocument = asyncHandler(async (req, res) => {
  await resolvePatient(req.params.patientId, req.user);

  try {
    const { buffer, contentType, contentDisposition, contentLength } =
      await getPatientDocument({
        documentId: req.params.documentId,
        authorization: req.headers.authorization
      });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', contentDisposition);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    return res.end(buffer);
  } catch (err) {
    throw new ApiError(StatusCodes.BAD_GATEWAY, err.message);
  }
});

/**
 * GET /patients/:patientId/documents/:documentId/download
 * Download a document as a file attachment.
 */
const downloadDocument = asyncHandler(async (req, res) => {
  await resolvePatient(req.params.patientId, req.user);

  try {
    const { buffer, contentType, contentDisposition, contentLength } =
      await downloadPatientDocument({
        documentId: req.params.documentId,
        authorization: req.headers.authorization
      });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', contentDisposition);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    return res.end(buffer);
  } catch (err) {
    throw new ApiError(StatusCodes.BAD_GATEWAY, err.message);
  }
});

/**
 * DELETE /patients/:patientId/documents/:documentId
 * Delete a document. Only uploader or admin.
 */
const deleteDocument = asyncHandler(async (req, res) => {
  await resolvePatient(req.params.patientId, req.user);

  try {
    await deletePatientDocument({
      documentId: req.params.documentId,
      authorization: req.headers.authorization
    });

    return res.status(StatusCodes.NO_CONTENT).send();
  } catch (err) {
    throw new ApiError(StatusCodes.BAD_GATEWAY, err.message);
  }
});

module.exports = {
  uploadDocument,
  listDocuments,
  getDocument,
  downloadDocument,
  deleteDocument
};