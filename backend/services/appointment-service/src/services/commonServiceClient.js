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
    // ── Format date ─────────────────────────────────────────────────────────
    const dateObj = new Date(scheduledAt);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const formattedTime = dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
    const appointmentType = type === 'video' ? 'Video Consultation' : 'In-Person Visit';
    const typeIcon = type === 'video' ? '🎥' : '🏥';

    // ── HTML Email ──────────────────────────────────────────────────────────
    const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Appointment Confirmed</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1d4ed8 0%,#7c3aed 100%);padding:36px 40px;text-align:center;">
              <div style="font-size:40px;margin-bottom:8px;">✅</div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.3px;">Appointment Confirmed!</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Your payment was successful and your slot is reserved.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">

              <!-- Token badge -->
              <div style="text-align:center;margin-bottom:28px;">
                <div style="display:inline-block;background:#eff6ff;border:2px solid #3b82f6;border-radius:12px;padding:14px 28px;">
                  <div style="font-size:11px;font-weight:600;color:#3b82f6;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Your Token Number</div>
                  <div style="font-size:28px;font-weight:800;color:#1d4ed8;letter-spacing:2px;">${tokenNumber}</div>
                </div>
              </div>

              <!-- Appointment details card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="font-size:13px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:16px;">Appointment Details</div>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="color:#64748b;font-size:13px;">👨‍⚕️ Doctor</span>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">
                          <span style="color:#0f172a;font-size:13px;font-weight:600;">${doctorName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="color:#64748b;font-size:13px;">🩺 Specialty</span>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">
                          <span style="color:#0f172a;font-size:13px;">${doctorSpecialty}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="color:#64748b;font-size:13px;">📅 Date</span>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">
                          <span style="color:#0f172a;font-size:13px;font-weight:600;">${formattedDate}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="color:#64748b;font-size:13px;">🕐 Time</span>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">
                          <span style="color:#0f172a;font-size:13px;font-weight:600;">${formattedTime}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="color:#64748b;font-size:13px;">${typeIcon} Type</span>
                        </td>
                        <td style="padding:8px 0;text-align:right;">
                          <span style="color:#0f172a;font-size:13px;">${appointmentType}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Payment confirmed badge -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;margin-bottom:24px;">
                <tr>
                  <td style="padding:14px 20px;">
                    <span style="font-size:13px;color:#166534;">💳 <strong>Payment Received</strong> — LKR 500.00 consultation fee paid successfully.</span>
                  </td>
                </tr>
              </table>

              <!-- Info note -->
              <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
                Please arrive <strong>10–15 minutes early</strong> and carry your token number <strong>${tokenNumber}</strong> with you.
                ${type === 'video' ? 'A video call link will be shared before your appointment time.' : 'Head to the reception and quote your token number when you arrive.'}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">UrbanCare Healthcare · This is an automated message, please do not reply.</p>
              <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1;">Ref: ${appointmentId}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // ── Plain-text fallback ─────────────────────────────────────────────────
    const textBody = [
      'APPOINTMENT CONFIRMED — UrbanCare',
      '',
      `Token Number : ${tokenNumber}`,
      `Doctor       : ${doctorName} (${doctorSpecialty})`,
      `Date         : ${formattedDate}`,
      `Time         : ${formattedTime}`,
      `Type         : ${appointmentType}`,
      `Payment      : LKR 500.00 — Paid ✓`,
      '',
      type === 'video'
        ? 'A video call link will be shared before your appointment.'
        : 'Please arrive 10-15 minutes early and quote your token number at reception.',
      '',
      `Reference: ${appointmentId}`,
      'UrbanCare Healthcare'
    ].join('\n');

    // ── SMS (concise, under 160 chars) ─────────────────────────────────────
    const smsBody = `UrbanCare: Appt CONFIRMED! Token: ${tokenNumber} | ${doctorName} | ${formattedDate} ${formattedTime} | ${appointmentType} | Payment: LKR 500 paid.`;

    const promises = [];

    if (email) {
      promises.push(
        client.post(
          '/notify/email',
          {
            to: email,
            subject: `Appointment Confirmed — Token ${tokenNumber} | UrbanCare`,
            text: textBody,
            html: htmlBody
          },
          { headers: { Authorization: authorization } }
        )
      );
    }

    if (phoneNumber) {
      promises.push(
        client.post(
          '/notify/sms',
          {
            to: phoneNumber,
            body: smsBody
          },
          { headers: { Authorization: authorization } }
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
