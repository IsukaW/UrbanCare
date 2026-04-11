const axios = require('axios');
const { env } = require('../config/env');
const logger = require('../config/logger');

/**
 * Patient Service Client
 * Handles all communication with patient-service for patient data and medical records
 */

const client = axios.create({
  baseURL: env.PATIENT_SERVICE_URL.replace(/\/$/, ''),
  timeout: 5000
});

/**
 * Get patient by ID (with medical history)
 * @param {object} options
 * @param {string} options.patientId - Patient document ID
 * @param {string} options.authorization - Bearer token
 * @returns {Promise<object>} - Patient document
 */
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

/**
 * Get patient's medical documents/records from common-service via patient-service
 * @param {object} options
 * @param {string} options.patientId - Patient document ID
 * @param {string} options.authorization - Bearer token
 * @returns {Promise<Array>} - Array of medical documents
 */
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

/**
 * Get patient's medical history
 * @param {object} options
 * @param {string} options.patientId - Patient document ID
 * @param {string} options.authorization - Bearer token
 * @returns {Promise<Array>} - Array of medical history entries
 */
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
