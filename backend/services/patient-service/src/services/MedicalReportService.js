const FormData = require('form-data');
const axios = require('axios');
const { env } = require('../config/env');

const BASE_URL = `${env.COMMON_SERVICE_URL.replace(/\/$/, '')}/documents`;

async function uploadPatientDocument({
  buffer,
  originalname,
  mimetype,
  category,
  linkedPatientId,
  description,
  authorization
}) {
  const form = new FormData();
  form.append('files', buffer, { filename: originalname, contentType: mimetype });
  form.append('category', category || 'other');
  form.append('description', description || '');
  form.append('linkedPatientId', linkedPatientId);

  const formHeaders = form.getHeaders();
  const contentLength = await new Promise((resolve, reject) => {
    form.getLength((err, length) => {
      if (err) reject(err);
      else resolve(length);
    });
  });

  const { data } = await axios.post(BASE_URL, form, {
    headers: {
      ...formHeaders,
      Authorization: authorization,
      'Content-Length': contentLength
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });

  const doc = Array.isArray(data) ? data[0] : data;
  if (!doc?._id) {
    throw new Error('Document store did not return a valid document ID');
  }
  return doc;
}
async function listPatientDocuments({ linkedPatientId, query, authorization }) {
  const { data } = await axios.get(BASE_URL, {
    headers: { Authorization: authorization },
    params: { ...query, linkedPatientId }
  });
  return data;
}

async function getPatientDocument({ documentId, authorization }) {
  const { data, headers } = await axios.get(`${BASE_URL}/${documentId}`, {
    headers: { Authorization: authorization },
    responseType: 'arraybuffer'
  });
  return {
    buffer: Buffer.from(data),
    contentType: headers['content-type'],
    contentDisposition: headers['content-disposition'],
    contentLength: headers['content-length']
  };
}

async function downloadPatientDocument({ documentId, authorization }) {
  const { data, headers } = await axios.get(`${BASE_URL}/${documentId}/download`, {
    headers: { Authorization: authorization },
    responseType: 'arraybuffer'
  });
  return {
    buffer: Buffer.from(data),
    contentType: headers['content-type'],
    contentDisposition: headers['content-disposition'],
    contentLength: headers['content-length']
  };
}

async function deletePatientDocument({ documentId, authorization }) {
  await axios.delete(`${BASE_URL}/${documentId}`, {
    headers: { Authorization: authorization }
  });
}

module.exports = {
  uploadPatientDocument,
  listPatientDocuments,
  getPatientDocument,
  downloadPatientDocument,
  deletePatientDocument
};