const FormData = require('form-data');
const axios = require('axios');
const { env } = require('../config/env');

// Uploads a file buffer to the common-service document store as a profile_photo.
// Only called from authenticated doctor routes.
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
