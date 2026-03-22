const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');
const { env } = require('../config/env');
const logger = require('../config/logger');

const isSendGridKey = (key) => typeof key === 'string' && key.startsWith('SG.');
const isBrevoSmtpKey = (key) => typeof key === 'string' && key.startsWith('xsmtpsib-');
const senderName = env.SENDGRID_FROM_NAME && env.SENDGRID_FROM_NAME.trim();

const sendGridFrom = senderName
  ? { email: env.SENDGRID_FROM_EMAIL, name: senderName }
  : env.SENDGRID_FROM_EMAIL;

const smtpFrom = senderName ? `${senderName} <${env.SENDGRID_FROM_EMAIL}>` : env.SENDGRID_FROM_EMAIL;

if (isSendGridKey(env.SENDGRID_API_KEY)) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
}

const brevoTransporter = isBrevoSmtpKey(env.SENDGRID_API_KEY)
  ? nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: env.BREVO_SMTP_LOGIN || 'apikey',
        pass: env.SENDGRID_API_KEY
      }
    })
  : null;

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
    throw new Error('Email provider is not configured');
  }

  if (isSendGridKey(env.SENDGRID_API_KEY)) {
    const msg = {
      to,
      from: sendGridFrom,
      subject,
      text,
      html
    };

    const [response] = await sgMail.send(msg);
    logger.info({ to, statusCode: response.statusCode, provider: 'sendgrid' }, 'Email notification sent');
    return;
  }

  if (brevoTransporter) {
    await brevoTransporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      text,
      html
    });
    logger.info({ to, provider: 'brevo-smtp' }, 'Email notification sent');
    return;
  }

  throw new Error('Unsupported email API key format. Use SendGrid API key (SG...) or Brevo SMTP key (xsmtpsib-...)');
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
