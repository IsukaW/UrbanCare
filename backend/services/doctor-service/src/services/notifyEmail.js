const { env } = require('../config/env');

/**
 * Calls common-service POST /notify/email.
 * Forwards caller Authorization so common-service authorization still applies.
 */
async function sendEmailNotification({ authorizationHeader, to, subject, text }) {
  const url = `${env.COMMON_SERVICE_URL.replace(/\/$/, '')}/notify/email`;
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

  if (!res.ok) {
    const msg = (data && data.message) || bodyText || res.statusText;
    throw new Error(msg || `Email notify failed (${res.status})`);
  }
}

module.exports = { sendEmailNotification };
