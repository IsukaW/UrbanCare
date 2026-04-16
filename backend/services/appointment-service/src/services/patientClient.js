const axios = require('axios');
const { env } = require('../config/env');
const logger = require('../config/logger');

// Axios client for calls to patient-service
const client = axios.create({
  baseURL: env.PATIENT_SERVICE_URL.replace(/\/$/, ''),
  timeout: 5000
});

// Fetches a patient profile by document _id.
async function getPatientById({ patientId, authorization }) {
  try {
    const { data } = await client.get(`/patients/${patientId}`, {
      headers: {
        Authorization: authorization
      }
    });
    return data;
  } catch (error) {
    logger.error({ err: error }, `Failed to fetch patient ${patientId}`);
    throw new Error(`Patient not found: ${error.message}`);
  }
}

// Returns all documents linked to the patient. Returns [] on failure.
async function getPatientMedicalDocuments({ patientId, authorization }) {
  try {
    const { data } = await client.get(`/patients/${patientId}/documents`, {
      headers: {
        Authorization: authorization
      }
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    logger.error({ err: error }, `Failed to fetch medical documents for patient ${patientId}`);
    return []; // Return empty array instead of throwing - documents might not exist
  }
}

// Returns the patient's medical history array. Returns [] on failure.
async function getPatientMedicalHistory({ patientId, authorization }) {
  try {
    const { data } = await client.get(`/patients/${patientId}`, {
      headers: {
        Authorization: authorization
      }
    });
    return data.medicalHistory || [];
  } catch (error) {
    logger.error({ err: error }, `Failed to fetch medical history for patient ${patientId}`);
    return [];
  }
}

module.exports = {
  getPatientById,
  getPatientMedicalDocuments,
  getPatientMedicalHistory
};
