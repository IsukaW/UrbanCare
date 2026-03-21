const axios = require('axios');
const { env } = require('../config/env');
const logger = require('../config/logger');

const client = axios.create({
  baseURL: env.COMMON_SERVICE_URL,
  timeout: 5000
});

const sendAppointmentCreatedNotification = async ({ token, email, phoneNumber, appointmentId, scheduledAt }) => {
  try {
    if (email) {
      await client.post(
        '/notify/email',
        {
          to: email,
          subject: 'Appointment Confirmed',
          text: `Your appointment ${appointmentId} is scheduled for ${scheduledAt}.`
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
    }

    if (phoneNumber) {
      await client.post(
        '/notify/sms',
        {
          to: phoneNumber,
          body: `Appointment ${appointmentId} confirmed for ${scheduledAt}.`
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to send appointment notification');
  }
};

module.exports = { sendAppointmentCreatedNotification };
