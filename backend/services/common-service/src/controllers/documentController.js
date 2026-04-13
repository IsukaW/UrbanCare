const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');
const Document = require('../models/Document');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');

const VALID_CATEGORIES = ['prescription', 'lab_report', 'medical_record', 'certificate', 'imaging', 'profile_photo', 'other'];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the requester is allowed to read the document. */
const canRead = (doc, user) => {
  if (user.role === 'admin') return true;
  if (doc.uploadedBy.userId === user.id) return true;
  if (doc.visibleTo.includes(user.id)) return true;
  // Profile photos are public to all authenticated users
  if (doc.category === 'profile_photo') return true;
  // Doctors can read any patient-linked document (for consultation)
  if (user.role === 'doctor' && doc.linkedPatientId) return true;
  return false;
};

/** Returns true if the requester is allowed to delete the document. */
const canDelete = (doc, user) => {
  if (user.role === 'admin') return true;
  if (doc.uploadedBy.userId === user.id) return true;
  return false;
};

/** Returns true if the requester is allowed to manage sharing. */
const canShare = (doc, user) => {
  if (user.role === 'admin') return true;
  if (doc.uploadedBy.userId === user.id) return true;
  return false;
};

// ── Validation schemas ────────────────────────────────────────────────────────

const uploadMetaSchema = Joi.object({
  category: Joi.string().valid(...VALID_CATEGORIES).default('other'),
  description: Joi.string().max(500).allow('').optional(),
  appointmentId: Joi.string().optional(),
  linkedDoctorId: Joi.string().optional(),
  linkedPatientId: Joi.string().optional(),
  // Comma-separated list of userIds to share with at upload time
  visibleTo: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string()),
      Joi.string() // JSON string or comma-separated
    )
    .optional(),
});

const shareSchema = Joi.object({
  add: Joi.array().items(Joi.string()).default([]),
  remove: Joi.array().items(Joi.string()).default([]),
}).or('add', 'remove');

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /documents
 * Upload one or more files. At least one file required.
 * Body fields (multipart/form-data):
 *   - files[]        (required, up to 5)
 *   - category       (optional)
 *   - description    (optional)
 *   - appointmentId  (optional)
 *   - visibleTo      (optional — JSON array string or comma-separated userIds)
 */
const uploadDocuments = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'At least one file is required');
  }

  // Parse text body fields
  const rawMeta = { ...req.body };
  if (typeof rawMeta.visibleTo === 'string') {
    try {
      rawMeta.visibleTo = JSON.parse(rawMeta.visibleTo);
    } catch {
      rawMeta.visibleTo = rawMeta.visibleTo.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  const { error, value } = uploadMetaSchema.validate(rawMeta, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const visibleTo = Array.isArray(value.visibleTo) ? value.visibleTo : [];

  const docs = await Document.insertMany(
    req.files.map((f) => ({
      uploadedBy: { userId: req.user.id, role: req.user.role },
      originalName: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      data: f.buffer.toString('base64'), // encode file bytes to base64
      category: value.category,
      description: value.description || '',
      appointmentId: value.appointmentId || null,
      linkedDoctorId: value.linkedDoctorId || null,
      linkedPatientId: value.linkedPatientId || null,
      visibleTo,
    }))
  );

  return res.status(StatusCodes.CREATED).json(docs);
});

/**
 * GET /documents
 * List all documents the requester can access:
 *   - Admin: all documents
 *   - Others: uploaded by me OR I am in visibleTo
 * Query params: category, appointmentId, page, limit
 */
const listDocuments = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = {};

  // Access filter
  if (req.user.role !== 'admin') {
    if (req.user.role === 'doctor') {
      // Doctors can list their own docs + docs shared with them + patient-linked docs
      filter.$or = [
        { 'uploadedBy.userId': req.user.id },
        { visibleTo: req.user.id },
        { linkedPatientId: { $exists: true, $ne: null } },
      ];
    } else {
      filter.$or = [
        { 'uploadedBy.userId': req.user.id },
        { visibleTo: req.user.id },
      ];
    }
  }

  // Optional category filter
  if (req.query.category && VALID_CATEGORIES.includes(req.query.category)) {
    filter.category = req.query.category;
  }

  // Optional appointment filter
  if (req.query.appointmentId) {
    filter.appointmentId = req.query.appointmentId;
  }

  // Optional doctor filter
  if (req.query.linkedDoctorId) {
    filter.linkedDoctorId = req.query.linkedDoctorId;
  }

  // Optional patient filter
  if (req.query.linkedPatientId) {
    filter.linkedPatientId = req.query.linkedPatientId;
  }

  const [docs, total] = await Promise.all([
    // Exclude the data field from list results — fetch full data via GET /:id
    Document.find(filter).select('-data').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Document.countDocuments(filter),
  ]);

  return res.status(StatusCodes.OK).json({
    data: docs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * GET /documents/:id
 * Serves the file inline so users can view it directly in the browser.
 * Images: <img src="..." /> — PDFs / docs: <iframe src="..." />
 * The frontend fetches this with axios (responseType: 'blob') and creates an object URL.
 */
const getDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) throw new ApiError(StatusCodes.NOT_FOUND, 'Document not found');

  if (!canRead(doc, req.user)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have access to this document');
  }

  const buffer = Buffer.from(doc.data, 'base64');
  res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
  res.setHeader('Content-Type', doc.mimetype);
  res.setHeader('Content-Length', buffer.length);
  return res.end(buffer);
});

/**
 * GET /documents/:id/download
 * Returns the raw file bytes decoded from the stored base64 — browser will download it.
 */
const downloadDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) throw new ApiError(StatusCodes.NOT_FOUND, 'Document not found');

  if (!canRead(doc, req.user)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have access to this document');
  }

  const buffer = Buffer.from(doc.data, 'base64');
  res.setHeader('Content-Disposition', `attachment; filename="${doc.originalName}"`);
  res.setHeader('Content-Type', doc.mimetype);
  res.setHeader('Content-Length', buffer.length);
  return res.end(buffer);
});

/**
 * DELETE /documents/:id
 * Deletes metadata + the physical file. Only uploader or admin.
 */
const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) throw new ApiError(StatusCodes.NOT_FOUND, 'Document not found');

  if (!canDelete(doc, req.user)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only the uploader or an admin can delete this document');
  }

  // Data is in MongoDB — just delete the document
  await doc.deleteOne();
  return res.status(StatusCodes.NO_CONTENT).send();
});

module.exports = {
  uploadDocuments,
  listDocuments,
  getDocument,
  downloadDocument,
  deleteDocument,
};
