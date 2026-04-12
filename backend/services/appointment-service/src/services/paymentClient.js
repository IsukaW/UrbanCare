const axios = require('axios');
const { env } = require('../config/env');
const logger = require('../config/logger');

/**
 * Payment Service Client
 * Handles payment processing and status management for appointments
 */

const client = axios.create({
  baseURL: env.PAYMENT_SERVICE_URL.replace(/\/$/, ''),
  timeout: 5000
});

/**
 * Process payment for appointment
 * @param {object} options
 * @param {string} options.appointmentId - Appointment ID
 * @param {number} options.amount - Payment amount
 * @param {string} options.patientId - Patient ID for payment record
 * @param {string} options.doctorId - Doctor ID for payment record
 * @param {string} options.paymentMethod - Payment method (card, upi, etc)
 * @param {string} options.authorization - Bearer token
 * @returns {Promise<object>} - Payment record with transactionId
 */
async function processPayment({
  appointmentId,
  amount,
  patientId,
  doctorId,
  paymentMethod,
  authorization
}) {
  try {
    // Common service exposes Stripe payment intent endpoints under /intent
    const { data } = await client.post(
      '/payments/intent',
      {
        amount,
        description: `Payment for appointment ${appointmentId}`,
        appointmentId
      },
      {
        headers: {
          Authorization: authorization
        }
      }
    );

    // Return the intent metadata to the caller (paymentIntentId, clientSecret, status, amount)
    return data;
  } catch (error) {
    logger.error({ err: error }, `Failed to process payment for appointment ${appointmentId}`);
    throw new Error(`Payment processing failed: ${error.message}`);
  }
}

/**
 * Get payment status by appointment ID
 * @param {object} options
 * @param {string} options.appointmentId - Appointment ID
 * @param {string} options.authorization - Bearer token
 * @returns {Promise<object>} - Payment status object
 */
async function getPaymentStatus({ appointmentId, authorization }) {
  try {
    const { data } = await client.get(`/payments/appointment/${appointmentId}`, {
      headers: {
        Authorization: authorization
      }
    });
    return data;
  } catch (error) {
    logger.error({ err: error }, `Failed to fetch payment status for appointment ${appointmentId}`);
    throw new Error(`Failed to fetch payment status: ${error.message}`);
  }
}

/**
 * Refund payment (currently not used per requirements - no refund on cancellation)
 * @param {object} options
 * @param {string} options.paymentId - Payment ID to refund
 * @param {string} options.reason - Reason for refund
 * @param {string} options.authorization - Bearer token
 * @returns {Promise<object>} - Refund record
 */
async function refundPayment({ paymentId, reason, authorization }) {
  try {
    const { data } = await client.post(
      `/payments/${paymentId}/refund`,
      { reason },
      {
        headers: {
          Authorization: authorization
        }
      }
    );
    return data;
  } catch (error) {
    logger.error({ err: error }, `Failed to refund payment ${paymentId}`);
    throw new Error(`Refund failed: ${error.message}`);
  }
}

/**
 * Update payment status (called when payment webhook received)
 * @param {object} options
 * @param {string} options.paymentId - Payment ID
 * @param {string} options.status - New payment status (paid, failed, etc)
 * @param {string} options.transactionId - Transaction reference
 * @param {string} options.authorization - Bearer token
 * @returns {Promise<object>} - Updated payment record
 */
async function updatePaymentStatus({ paymentId, status, transactionId, authorization }) {
  try {
    const { data } = await client.patch(
      `/payments/${paymentId}`,
      { status, transactionId },
      {
        headers: {
          Authorization: authorization
        }
      }
    );
    return data;
  } catch (error) {
    logger.error({ err: error }, `Failed to update payment status for ${paymentId}`);
    throw new Error(`Failed to update payment status: ${error.message}`);
  }
}

/**
 * Retrieve a payment intent by its ID
 * @param {object} options
 * @param {string} options.paymentIntentId - Stripe PaymentIntent ID
 * @param {string} options.authorization - Bearer token
 * @returns {Promise<object>} - Payment intent object { paymentIntentId, status, amount, ... }
 */
async function retrievePaymentIntent({ paymentIntentId, authorization }) {
  try {
    const { data } = await client.get(`/payments/intent/${paymentIntentId}`, {
      headers: { Authorization: authorization }
    });
    // common-service returns { message, data: { paymentIntentId, status, ... } }
    return data.data ?? data;
  } catch (error) {
    logger.error({ err: error }, `Failed to retrieve payment intent ${paymentIntentId}`);
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message;
    const err = new Error(msg);
    err.statusCode = status;
    throw err;
  }
}

module.exports = {
  processPayment,
  getPaymentStatus,
  refundPayment,
  updatePaymentStatus,
  retrievePaymentIntent
};
