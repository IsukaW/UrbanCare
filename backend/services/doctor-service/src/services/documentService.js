const FormData = require('form-data');
const { env } = require('../config/env');

/**
 * Uploads a file buffer to the common-service document store.
 *
 * @param {object} options
 * @param {Buffer}  options.buffer          - Raw file bytes
 * @param {string}  options.originalname    - Original filename
 * @param {string}  options.mimetype        - MIME type of the file
 * @param {string}  options.linkedDoctorId  - Doctor _id to link the document to
 * @param {string}  options.description     - Human-readable description
 * @param {string}  options.authorization   - Bearer token forwarded from the caller
 * @returns {Promise<object>}               - The first created document object from common-service
 */
async function uploadDoctorDocument({ buffer, originalname, mimetype, linkedDoctorId, description, authorization }) {
  const form = new FormData();
  form.append('files', buffer, { filename: originalname, contentType: mimetype });
  form.append('category', 'other');
  form.append('description', description);
  form.append('linkedDoctorId', linkedDoctorId);

  const url = `${env.COMMON_SERVICE_URL.replace(/\/$/, '')}/documents`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...form.getHeaders(),
      Authorization: authorization
    },
    body: form
  });

  const bodyText = await response.text();
  let data;
  try {
    data = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const msg = data?.message || bodyText || `Common-service responded with ${response.status}`;
    throw new Error(msg);
  }

  // common-service returns an array of created document objects — return the first
  const doc = Array.isArray(data) ? data[0] : data;
  if (!doc?._id) {
    throw new Error('Document store did not return a valid document ID');
  }

  return doc;
}

module.exports = { uploadDoctorDocument };
