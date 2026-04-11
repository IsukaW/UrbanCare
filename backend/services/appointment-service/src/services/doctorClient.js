const axios = require('axios');
const { env } = require('../config/env');
const logger = require('../config/logger');


const client = axios.create({
  baseURL: env.DOCTOR_SERVICE_URL.replace(/\/$/, ''),
  timeout: 5000
});

/**
 * Get all doctors (with optional filters)
 * @param {object} options
 * @param {string} options.authorization - Bearer token from request header
 * @returns {Promise<Array>} - Array of doctor documents
 */
async function getDoctors({ authorization }) {
  try {
    const { data } = await client.get('/doctors', {
      headers: {
        Authorization: authorization
      }
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch doctors from doctor-service');
    throw new Error(`Failed to fetch doctors: ${error.message}`);
  }
}

/**
 * Get doctor by ID
 * @param {object} options
 * @param {string} options.doctorId - Doctor document ID
 * @param {string} options.authorization - Bearer token
 * @returns {Promise<object>} - Doctor document
 */
async function getDoctorById({ doctorId, authorization }) {
  try {
    const { data } = await client.get(`/doctors/${doctorId}`, {
      headers: {
        Authorization: authorization
      }
    });
    return data;
  } catch (error) {
    logger.error({ err: error }, `Failed to fetch doctor ${doctorId}`);
    throw new Error(`Doctor not found: ${error.message}`);
  }
}

/**
 * Get available slots for a doctor for a specific week
 * @param {object} options
 * @param {string} options.doctorId - Doctor document ID
 * @param {string} options.weekStartMonday - Week start date in YYYY-MM-DD format
 * @param {string} options.authorization - Bearer token
 * @returns {Promise<Array>} - Available slots for that week
 */
async function getAvailableSlots({ doctorId, weekStartMonday, authorization }) {
  try {
    const { data } = await client.get(`/doctors/${doctorId}/slots/available`, {
      headers: {
        Authorization: authorization
      },
      params: { weekStartMonday }
    });
    // Doctor-service returns: { doctorId, weekStartMonday, weeklyAvailability: [...] }
    return data?.weeklyAvailability || [];
  } catch (error) {
    logger.error({ err: error }, `Failed to fetch available slots for doctor ${doctorId} for week ${weekStartMonday}`);
    console.error('Slot fetch error details:', error.response?.data || error.message);
    return []; // Return empty array instead of throwing - slots might not be available
  }
}

/**
 * Get doctor's weekly schedule for a specific week
 * @param {object} options
 * @param {string} options.doctorId - Doctor document ID
 * @param {string} options.weekStartMonday - Week start date in YYYY-MM-DD format
 * @param {string} options.authorization - Bearer token
 * @returns {Promise<Array>} - Doctor's slots for that week
 */
async function getDoctorSchedule({ doctorId, weekStartMonday, authorization }) {
  try {
    const { data } = await client.get(`/doctors/${doctorId}/schedule`, {
      headers: {
        Authorization: authorization
      },
      params: { weekStartMonday }
    });
    return data;
  } catch (error) {
    logger.error({ err: error }, `Failed to fetch schedule for doctor ${doctorId}`);
    throw new Error(`Failed to fetch doctor schedule: ${error.message}`);
  }
}

/**
 * Reserve a slot token for an appointment
 * @param {object} options
 * @param {string} options.doctorId - Doctor document ID
 * @param {string} options.slotId - Slot ID to reserve
 * @param {string} options.authorization - Bearer token from request header
 * @returns {Promise<object>} - Updated slot with reservation info
 */
async function reserveSlot({ doctorId, slotId, authorization }) {
  try {
    const { data } = await client.post(
      `/doctors/${doctorId}/slots/${slotId}/reserve`,
      {},
      {
        headers: {
          Authorization: authorization
        }
      }
    );
    return data;
  } catch (error) {
    logger.error({ err: error }, `Failed to reserve slot for doctor ${doctorId}`);
    throw new Error(`Failed to reserve slot: ${error.message}`);
  }
}

/**
 * Release a reserved slot token (e.g., when appointment is cancelled)
 * @param {object} options
 * @param {string} options.doctorId - Doctor document ID
 * @param {string} options.slotId - Slot ID to release
 * @param {string} options.authorization - Bearer token from request header
 * @returns {Promise<object>} - Updated slot
 */
async function releaseSlot({ doctorId, slotId, authorization }) {
  try {
    const { data } = await client.post(
      `/doctors/${doctorId}/slots/${slotId}/release`,
      {},
      {
        headers: {
          Authorization: authorization
        }
      }
    );
    return data;
  } catch (error) {
    logger.error({ err: error }, `Failed to release slot for doctor ${doctorId}`);
    throw new Error(`Failed to release slot: ${error.message}`);
  }
}

/**
 * Get doctor's prescriptions for an appointment/patient
 * @param {object} options
 * @param {string} options.doctorId - Doctor document ID
 * @param {string} options.appointmentId - Appointment ID (optional)
 * @param {string} options.authorization - Bearer token
 * @returns {Promise<Array>} - Array of prescriptions
 */
async function getDoctorPrescriptions({ doctorId, appointmentId, authorization }) {
  try {
    // Note: Prescription endpoint structure may vary - this can be adapted
    const params = appointmentId ? { appointmentId } : {};
    const { data } = await client.get(`/doctors/${doctorId}/prescriptions`, {
      headers: {
        Authorization: authorization
      },
      params
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    logger.error({ err: error }, `Failed to fetch prescriptions for doctor ${doctorId}`);
    return []; // Return empty array - prescriptions not available yet
  }
}

module.exports = {
  getDoctors,
  getDoctorById,
  getDoctorSchedule,
  getAvailableSlots,
  reserveSlot,
  releaseSlot,
  getDoctorPrescriptions
};
