const axios = require('axios');
const { env } = require('../config/env');
const logger = require('../config/logger');


const client = axios.create({
  baseURL: env.DOCTOR_SERVICE_URL.replace(/\/$/, ''),
  timeout: 5000
});

// Fetches all doctor profiles. Returns [] on failure.
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

// Fetches a single doctor by their profile _id.
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

// Returns slots that still have capacity for the given week.
// Returns [] rather than throwing so a missing schedule doesn't blow up search.
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

// Fetches the full weekly schedule for a doctor (reserved + available slots).
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

// Reserves one token on the given slot.
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

// Releases a previously reserved token (e.g. on cancellation).
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

// Returns prescriptions for a doctor. Optional appointmentId filter.
// Returns [] if none exist yet.
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

/**
 * Resolve a doctor's profile _id from their auth userId.
 * Appointments store the doctor profile _id, not the auth userId,
 * so this is needed for access checks when a doctor calls the API.
 */
async function getDoctorProfileByUserId({ userId, authorization }) {
  try {
    const { data } = await client.get(`/doctors/user/${userId}`, {
      headers: { Authorization: authorization }
    });
    return data; // { _id, userId, fullName, ... }
  } catch (error) {
    logger.error({ err: error }, `Failed to resolve doctor profile for userId ${userId}`);
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message;
    const err = new Error(msg);
    err.statusCode = status;
    throw err;
  }
}

module.exports = {
  getDoctors,
  getDoctorById,
  getDoctorSchedule,
  getAvailableSlots,
  reserveSlot,
  releaseSlot,
  getDoctorPrescriptions,
  getDoctorProfileByUserId,
};
