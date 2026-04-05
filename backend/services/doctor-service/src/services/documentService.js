const FormData = require('form-data');
const axios = require('axios');
const { env } = require('../config/env');

/**
 * Uploads a file buffer to the common-service document store.
 * In doctor-service this is only invoked from authenticated doctor routes (own profile photo).
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
  form.append('category', 'profile_photo');
  form.append('description', description);
  form.append('linkedDoctorId', linkedDoctorId);

  const url = `${env.COMMON_SERVICE_URL.replace(/\/$/, '')}/documents`;
  const response = await axios.post(url, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: authorization
    }
  });

  const data = response.data;

  // common-service returns an array of created document objects — return the first
  const doc = Array.isArray(data) ? data[0] : data;
  if (!doc?._id) {
    throw new Error('Document store did not return a valid document ID');
  }

  return doc;
}

module.exports = { uploadDoctorDocument };
