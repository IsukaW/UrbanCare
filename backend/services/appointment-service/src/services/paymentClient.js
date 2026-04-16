const axios = require('axios');
const { env } = require('../config/env');
const logger = require('../config/logger');

// Axios client pointed at common-service's payment endpoints
const client = axios.create({
  baseURL: env.PAYMENT_SERVICE_URL.replace(/\/$/, ''),
  timeout: 5000
});

// Creates a Stripe PaymentIntent via common-service.
// Returns the intent metadata (paymentIntentId, clientSecret, status).
async function processPayment({
  appointmentId,
  amount,
  patientId,
  doctorId,
  paymentMethod,
  authorization
}) {
  try {
    // common-service routes Stripe through /payments/intent
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

    return data;
  } catch (error) {
    logger.error({ err: error }, `Failed to process payment for appointment ${appointmentId}`);
    throw new Error(`Payment processing failed: ${error.message}`);
  }
}

// Looks up a payment record by appointment ID from common-service.
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

// Not used yet (no refunds per requirements), kept for future use.
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

// Patches a payment record's status (called from the webhook handler).
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

// Retrieves a Stripe PaymentIntent by ID.
// common-service wraps the result under data.data, so we unwrap it.
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
