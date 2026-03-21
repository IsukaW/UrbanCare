const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const { env } = require('../config/env');
const logger = require('../config/logger');

if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
}

const getTwilioClient = () => {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_API_KEY || !env.TWILIO_API_SECRET) {
    return null;
  }

  return twilio(env.TWILIO_API_KEY, env.TWILIO_API_SECRET, {
    accountSid: env.TWILIO_ACCOUNT_SID
  });
};

const sendEmail = async ({ to, subject, text, html }) => {
  if (!env.SENDGRID_API_KEY || !env.SENDGRID_FROM_EMAIL) {
    throw new Error('SendGrid is not configured');
  }

  const msg = {
    to,
    from: env.SENDGRID_FROM_EMAIL,
    subject,
    text,
    html
  };

  const [response] = await sgMail.send(msg);
  logger.info({ to, statusCode: response.statusCode }, 'Email notification sent');
};

const sendSms = async ({ to, body }) => {
  const client = getTwilioClient();
  if (!client || !env.TWILIO_FROM_NUMBER) {
    throw new Error('Twilio is not configured');
  }

  const response = await client.messages.create({
    to,
    from: env.TWILIO_FROM_NUMBER,
    body
  });

  logger.info({ sid: response.sid, to }, 'SMS notification sent');
};

module.exports = { sendEmail, sendSms };
