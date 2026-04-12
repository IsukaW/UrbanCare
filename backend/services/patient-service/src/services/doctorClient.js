const axios = require('axios');
const { env } = require('../config/env');
const logger = require('../config/logger');

const client = axios.create({
  baseURL: env.DOCTOR_SERVICE_URL.replace(/\/$/, ''),
  timeout: 5000
});

/**
 * Get all doctors with optional specialty filter
 * @param {object} options
 * @param {string} options.authorization - Bearer token
 * @param {string} [options.specialty] - Filter by specialization
 * @returns {Promise<Array>}
 */
async function getDoctors({ authorization, specialty } = {}) {
  try {
    const params = specialty ? { specialty } : {};
    const { data } = await client.get('/doctors', {
      headers: { Authorization: authorization },
      params
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch doctors from doctor-service');
    throw new Error(`Failed to fetch doctors: ${error.message}`);
  }
}

/**
 * Get a single doctor profile by ID
 * @param {object} options
 * @param {string} options.doctorId
 * @param {string} options.authorization
 * @returns {Promise<object>}
 */
async function getDoctorById({ doctorId, authorization }) {
  try {
    const { data } = await client.get(`/doctors/${doctorId}`, {
      headers: { Authorization: authorization }
    });
    return data;
  } catch (error) {
    logger.error({ err: error }, `Failed to fetch doctor ${doctorId}`);
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message;
    const err = new Error(msg);
    err.statusCode = status;
    throw err;
  }
}

/**
 * Get available slots for a doctor for a given week
 * @param {object} options
 * @param {string} options.doctorId
 * @param {string} options.weekStartMonday - YYYY-MM-DD (Monday of the week)
 * @param {string} options.authorization
 * @returns {Promise<Array>} - Array of slot objects that still have available tokens
 */
async function getAvailableSlots({ doctorId, weekStartMonday, authorization }) {
  try {
    const { data } = await client.get(`/doctors/${doctorId}/slots/available`, {
      headers: { Authorization: authorization },
      params: { weekStartMonday }
    });
    return data?.weeklyAvailability || [];
  } catch (error) {
    logger.error({ err: error }, `Failed to fetch available slots for doctor ${doctorId}`);
    return [];
  }
}

module.exports = { getDoctors, getDoctorById, getAvailableSlots };
