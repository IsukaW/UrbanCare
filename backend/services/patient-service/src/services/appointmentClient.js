const axios = require('axios');
const { env } = require('../config/env');
const logger = require('../config/logger');

const client = axios.create({
  baseURL: env.APPOINTMENT_SERVICE_URL.replace(/\/$/, ''),
  timeout: 8000
});

async function bookAppointment({ body, authorization }) {
  try {
    const { data } = await client.post('/appointments', body, {
      headers: { Authorization: authorization }
    });
    return data;
  } catch (error) {
    logger.error({ err: error }, 'Failed to book appointment');
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message;
    const err = new Error(msg);
    err.statusCode = status;
    throw err;
  }
}

async function getPatientAppointments({ patientId, status, authorization }) {
  try {
    const params = { patientId };
    if (status) params.status = status;
    const { data } = await client.get('/appointments', {
      headers: { Authorization: authorization },
      params
    });
    return Array.isArray(data) ? data : data?.appointments || [];
  } catch (error) {
    logger.error({ err: error }, `Failed to fetch appointments for patient ${patientId}`);
    const status2 = error.response?.status;
    const msg = error.response?.data?.message || error.message;
    const err = new Error(msg);
    err.statusCode = status2;
    throw err;
  }
}

async function getAppointmentById({ appointmentId, authorization }) {
  try {
    const { data } = await client.get(`/appointments/${appointmentId}`, {
      headers: { Authorization: authorization }
    });
    return data;
  } catch (error) {
    logger.error({ err: error }, `Failed to fetch appointment ${appointmentId}`);
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message;
    const err = new Error(msg);
    err.statusCode = status;
    throw err;
  }
}

async function requestCancellation({ appointmentId, reason, authorization }) {
  try {
    const { data } = await client.post(
      `/appointments/${appointmentId}/request-cancellation`,
      { reason },
      { headers: { Authorization: authorization } }
    );
    return data;
  } catch (error) {
    logger.error({ err: error }, `Failed to request cancellation for appointment ${appointmentId}`);
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message;
    const err = new Error(msg);
    err.statusCode = status;
    throw err;
  }
}

module.exports = {
  bookAppointment,
  getPatientAppointments,
  getAppointmentById,
  requestCancellation
};
