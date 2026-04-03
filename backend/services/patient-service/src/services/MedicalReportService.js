const axios = require('axios');
const FormData = require('form-data');
const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');

const DOCUMENTS_URL = `${env.COMMON_SERVICE_URL}/documents`;

/**
 * Forward the raw file buffer(s) to common-service and return created document(s).
 * @param {Express.Multer.File[]} files  - multer memoryStorage files
 * @param {object} meta                  - { category, description, appointmentId, visibleTo }
 * @param {string} token                 - Bearer token from the original request
 */
const uploadDocuments = async (files, meta, token) => {
  const form = new FormData();

  for (const file of files) {
    form.append('files', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype
    });
  }

  if (meta.category)      form.append('category', meta.category);
  if (meta.description)   form.append('description', meta.description);
  if (meta.appointmentId) form.append('appointmentId', meta.appointmentId);
  if (meta.visibleTo && meta.visibleTo.length > 0) {
    form.append('visibleTo', JSON.stringify(meta.visibleTo));
  }

  try {
    const { data } = await axios.post(DOCUMENTS_URL, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });
    return data;
  } catch (err) {
    const status = err.response?.status || StatusCodes.BAD_GATEWAY;
    const message = err.response?.data?.message || 'Failed to upload documents to common-service';
    throw new ApiError(status, message);
  }
};

/**
 * List documents from common-service accessible to the requester.
 * @param {object} query  - { category, appointmentId, page, limit }
 * @param {string} token  - Bearer token
 */
const listDocuments = async (query, token) => {
  try {
    const { data } = await axios.get(DOCUMENTS_URL, {
      headers: { Authorization: `Bearer ${token}` },
      params: query
    });
    return data;
  } catch (err) {
    const status = err.response?.status || StatusCodes.BAD_GATEWAY;
    const message = err.response?.data?.message || 'Failed to fetch documents from common-service';
    throw new ApiError(status, message);
  }
};

/**
 * Get a single document's metadata + inline content from common-service.
 * @param {string} documentId
 * @param {string} token
 */
const getDocument = async (documentId, token) => {
  try {
    const { data, headers } = await axios.get(`${DOCUMENTS_URL}/${documentId}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer'
    });
    return { data, headers };
  } catch (err) {
    const status = err.response?.status || StatusCodes.BAD_GATEWAY;
    const message = err.response?.data?.message || 'Failed to fetch document from common-service';
    throw new ApiError(status, message);
  }
};

/**
 * Download a document file from common-service.
 * @param {string} documentId
 * @param {string} token
 */
const downloadDocument = async (documentId, token) => {
  try {
    const { data, headers } = await axios.get(`${DOCUMENTS_URL}/${documentId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer'
    });
    return { data, headers };
  } catch (err) {
    const status = err.response?.status || StatusCodes.BAD_GATEWAY;
    const message = err.response?.data?.message || 'Failed to download document from common-service';
    throw new ApiError(status, message);
  }
};

/**
 * Delete a document from common-service.
 * @param {string} documentId
 * @param {string} token
 */
const deleteDocument = async (documentId, token) => {
  try {
    await axios.delete(`${DOCUMENTS_URL}/${documentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (err) {
    const status = err.response?.status || StatusCodes.BAD_GATEWAY;
    const message = err.response?.data?.message || 'Failed to delete document from common-service';
    throw new ApiError(status, message);
  }
};

module.exports = {
  uploadDocuments,
  listDocuments,
  getDocument,
  downloadDocument,
  deleteDocument
};