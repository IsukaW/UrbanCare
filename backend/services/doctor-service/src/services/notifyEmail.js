const { env } = require('../config/env');
const nodemailer = require('nodemailer');

const isBrevoSmtpKey = (key) => typeof key === 'string' && key.startsWith('xsmtpsib-');

const hasDirectEmailConfig =
  !!env.SENDGRID_FROM_EMAIL && !!env.SENDGRID_API_KEY && isBrevoSmtpKey(env.SENDGRID_API_KEY);

const smtpTransporter = hasDirectEmailConfig
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

const smtpFrom = env.SENDGRID_FROM_NAME?.trim()
  ? `${env.SENDGRID_FROM_NAME.trim()} <${env.SENDGRID_FROM_EMAIL}>`
  : env.SENDGRID_FROM_EMAIL;

function candidateNotifyUrls() {
  const base = (env.COMMON_SERVICE_URL || '').replace(/\/$/, '');
  const list = [];
  if (base) list.push(`${base}/notify/email`);
  // Local dev fallback when docker-style hostname is configured in .env
  if (base.includes('://common-service:')) {
    list.push(`${base.replace('://common-service:', '://localhost:')}/notify/email`);
  }
  return [...new Set(list)];
}

/**
 * Calls common-service POST /notify/email (same contract as sendEmailNotification).
 * Forwards the caller Authorization header so an admin JWT is accepted by common-service.
 */
async function sendEmailNotification({ authorizationHeader, to, subject, text }) {
  const errors = [];

  if (smtpTransporter) {
    try {
      await smtpTransporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        text,
        html: text
      });
      return;
    } catch (e) {
      errors.push(`SMTP: ${e?.message || 'failed'}`);
    }
  }

  const urls = candidateNotifyUrls();
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authorizationHeader ? { Authorization: authorizationHeader } : {})
        },
        body: JSON.stringify({
          to,
          subject,
          text,
          html: text
        })
      });

      const bodyText = await res.text();
      let data;
      try {
        data = bodyText ? JSON.parse(bodyText) : null;
      } catch {
        data = null;
      }

      if (res.ok) return;
      const msg = (data && data.message) || bodyText || res.statusText;
      errors.push(`API ${url}: ${msg || `status ${res.status}`}`);
    } catch (e) {
      errors.push(`API ${url}: ${e?.message || 'request failed'}`);
    }
  }

  throw new Error(errors.join(' | ') || 'Email notification failed');
}

module.exports = { sendEmailNotification };
