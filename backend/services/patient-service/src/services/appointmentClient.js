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

async function getPatientAppointments({ patientId, doctorId, paymentStatus, status, page, limit, authorization }) {
  try {
    const params = {};
    if (patientId)     params.patientId     = patientId;
    if (doctorId)      params.doctorId      = doctorId;
    if (paymentStatus) params.paymentStatus = paymentStatus;
    if (status) params.status = status;
    if (page)   params.page  = page;
    if (limit)  params.limit = limit;
    const { data } = await client.get('/appointments', {
      headers: { Authorization: authorization },
      params
    });
    // Support both paginated { appointments, pagination } and legacy plain array
    if (data && data.appointments !== undefined) return data;
    return { appointments: Array.isArray(data) ? data : [], pagination: null };
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch appointments');
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

async function confirmPaymentForAppointment({ appointmentId, paymentIntentId, authorization }) {
  try {
    const { data } = await client.post(
      `/appointments/${appointmentId}/confirm-payment`,
      { paymentIntentId },
      { headers: { Authorization: authorization } }
    );
    return data;
  } catch (error) {
    logger.error({ err: error }, `Failed to confirm payment for appointment ${appointmentId}`);
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message;
    const err = new Error(msg);
    err.statusCode = status;
    throw err;
  }
}

async function updateAppointment({ appointmentId, body, authorization }) {
  try {
    const { data } = await client.put(
      `/appointments/${appointmentId}`,
      body,
      { headers: { Authorization: authorization } }
    );
    return data;
  } catch (error) {
    logger.error({ err: error }, `Failed to update appointment ${appointmentId}`);
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
  requestCancellation,
  confirmPaymentForAppointment,
  updateAppointment
};
