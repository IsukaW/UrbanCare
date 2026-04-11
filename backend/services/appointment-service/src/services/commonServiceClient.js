const axios = require('axios');
const { env } = require('../config/env');
const logger = require('../config/logger');

/**
 * Common Service Client
 * Handles notifications and document operations from common-service
 */

const client = axios.create({
  baseURL: env.COMMON_SERVICE_URL.replace(/\/$/, ''),
  timeout: 5000
});

/**
 * Send appointment confirmation notification
 * @param {object} options
 * @param {string} options.email - Recipient email address
 * @param {string} options.phoneNumber - Recipient phone number
 * @param {string} options.appointmentId - Appointment ID
 * @param {string} options.scheduledAt - Appointment date/time
 * @param {string} options.doctorName - Doctor's name
 * @param {string} options.doctorSpecialty - Doctor's specialty
 * @param {string} options.tokenNumber - Appointment token
 * @param {string} options.type - Appointment type (video/in-person)
 * @param {string} options.authorization - Bearer token
 * @returns {Promise<object>} - Notification record
 */
async function sendAppointmentConfirmationNotification({
  email,
  phoneNumber,
  appointmentId,
  scheduledAt,
  doctorName,
  doctorSpecialty,
  tokenNumber,
  type,
  authorization
}) {
  try {
    const message = `Your appointment with Dr. ${doctorName} (${doctorSpecialty}) has been confirmed for ${scheduledAt}. Type: ${type}. Token: ${tokenNumber}`;

    const promises = [];

    if (email) {
      promises.push(
        client.post(
          '/notify/email',
          {
            to: email,
            subject: 'Appointment Confirmed',
            text: message,
            appointmentId
          },
          {
            headers: { Authorization: authorization }
          }
        )
      );
    }

    if (phoneNumber) {
      promises.push(
        client.post(
          '/notify/sms',
          {
            to: phoneNumber,
            body: message,
            appointmentId
          },
          {
            headers: { Authorization: authorization }
          }
        )
      );
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to send appointment confirmation notification');
    // Don't throw - notification failure should not block appointment
  }
}

/**
 * Send appointment status update notification
 * @param {object} options
 * @param {string} options.email - Recipient email
 * @param {string} options.appointmentId - Appointment ID
 * @param {string} options.status - New appointment status
 * @param {string} options.message - Custom message
 * @param {string} options.authorization - Bearer token
 * @returns {Promise<void>}
 */
async function sendAppointmentStatusNotification({
  email,
  appointmentId,
  status,
  message,
  authorization
}) {
  try {
    if (!email) return;

    let subject = 'Appointment Status Updated';
    let body = message || `Your appointment status is now: ${status}`;

    switch (status) {
      case 'confirmed':
        subject = 'Appointment Confirmed';
        body = 'Your appointment has been confirmed.';
        break;
      case 'cancelled':
        subject = 'Appointment Cancelled';
        body = 'Your appointment has been cancelled. No refund will be issued. You can reschedule with admin approval.';
        break;
      case 'rescheduled':
        subject = 'Appointment Rescheduled';
        body = 'Your appointment has been rescheduled. Please check the new date and time.';
        break;
      case 'completed':
        subject = 'Appointment Completed';
        body = 'Your appointment has been completed.';
        break;
    }

    await client.post(
      '/notify/email',
      {
        to: email,
        subject,
        text: body,
        appointmentId
      },
      {
        headers: { Authorization: authorization }
      }
    );
  } catch (error) {
    logger.error({ err: error }, 'Failed to send appointment status notification');
    // Don't throw - notification failure should not block status update
  }
}

/**
 * Send cancellation request notification to admin
 * @param {object} options
 * @param {string} options.appointmentId - Appointment ID
 * @param {string} options.patientId - Patient ID
 * @param {string} options.doctorName - Doctor name
 * @param {string} options.scheduledAt - Appointment date
 * @param {string} options.reason - Cancellation reason
 * @param {string} options.authorization - Bearer token
 * @returns {Promise<void>}
 */
async function sendCancellationRequestNotification({
  appointmentId,
  patientId,
  doctorName,
  scheduledAt,
  reason,
  authorization
}) {
  try {
    const subject = `Appointment Cancellation Request - ${appointmentId}`;
    const text = `
Patient ${patientId} has requested to cancel their appointment with Dr. ${doctorName}.
Scheduled for: ${scheduledAt}
Reason: ${reason}
Please review and approve/offer reschedule.
    `;

    await client.post(
      '/notify/email',
      {
        to: 'admin@urbancare.com', // Will be overridden with actual admin email in common-service
        subject,
        text,
        appointmentId,
        type: 'admin_alert'
      },
      {
        headers: { Authorization: authorization }
      }
    );
  } catch (error) {
    logger.error({ err: error }, 'Failed to send cancellation request notification');
    // Don't throw - notification failure should not block cancellation request
  }
}

/**
 * Get document details from common-service
 * @param {object} options
 * @param {string} options.documentId - Document ID in common-service
 * @param {string} options.authorization - Bearer token
 * @returns {Promise<object>} - Document details
 */
async function getDocument({ documentId, authorization }) {
  try {
    const { data } = await client.get(`/documents/${documentId}`, {
      headers: {
        Authorization: authorization
      }
    });
    return data;
  } catch (error) {
    logger.error({ err: error }, `Failed to fetch document ${documentId}`);
    throw new Error(`Document not found: ${error.message}`);
  }
}

/**
 * Get prescription/documents related to a doctor
 * @param {object} options
 * @param {string} options.doctorId - Doctor ID
 * @param {string} options.category - Document category (e.g., 'prescription')
 * @param {string} options.authorization - Bearer token
 * @returns {Promise<Array>} - Array of documents
 */
async function getDoctorDocuments({ doctorId, category = 'prescription', authorization }) {
  try {
    const { data } = await client.get('/documents', {
      headers: {
        Authorization: authorization
      },
      params: {
        linkedDoctorId: doctorId,
        category
      }
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    logger.error({ err: error }, `Failed to fetch documents for doctor ${doctorId}`);
    return []; // Return empty array - documents might not exist
  }
}

/**
 * List patient's medical documents
 * @param {object} options
 * @param {string} options.patientId - Patient ID
 * @param {string} options.category - Document category filter (optional)
 * @param {string} options.authorization - Bearer token
 * @returns {Promise<Array>} - Array of documents
 */
async function getPatientDocuments({ patientId, category, authorization }) {
  try {
    const params = { linkedPatientId: patientId };
    if (category) params.category = category;

    const { data } = await client.get('/documents', {
      headers: {
        Authorization: authorization
      },
      params
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    logger.error({ err: error }, `Failed to fetch documents for patient ${patientId}`);
    return [];
  }
}

module.exports = {
  sendAppointmentConfirmationNotification,
  sendAppointmentStatusNotification,
  sendCancellationRequestNotification,
  getDocument,
  getDoctorDocuments,
  getPatientDocuments
};
