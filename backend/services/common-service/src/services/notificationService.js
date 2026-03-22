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

const getSmsApiUrl = () => `${env.SMSAPI_LK_BASE_URL.replace(/\/+$/, '')}/api/v3/sms/send`;

const getSmsApiToken = () => {
  const raw = env.SMSAPI_LK_TOKEN || '';
  return raw.replace(/^Authorization:\s*/i, '').replace(/^Bearer\s+/i, '').trim();
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
  const token = getSmsApiToken();
  if (!token || !env.SMSAPI_LK_SENDER_ID) {
    throw new Error('SMSAPI.LK is not configured: set SMSAPI_LK_TOKEN and SMSAPI_LK_SENDER_ID');
  }

  const requestBody = {
    recipient: to,
    sender_id: env.SMSAPI_LK_SENDER_ID,
    type: env.SMSAPI_LK_MESSAGE_TYPE,
    message: body
  };

  const response = await fetch(getSmsApiUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  const responseText = await response.text();
  let responseData;
  try {
    responseData = responseText ? JSON.parse(responseText) : null;
  } catch (error) {
    responseData = { raw: responseText };
  }

  if (!response.ok) {
    logger.error(
      {
        to,
        statusCode: response.status,
        providerResponse: responseData
      },
      'SMSAPI.LK send failed'
    );
    throw new Error(`SMSAPI.LK request failed with status ${response.status}`);
  }

  logger.info({ to, statusCode: response.status, provider: 'smsapi.lk' }, 'SMS notification sent');
  return {
    statusCode: response.status,
    provider: 'smsapi.lk',
    response: responseData
  };
};

module.exports = { sendEmail, sendSms };
