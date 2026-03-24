const Stripe = require('stripe');
const { env } = require('../config/env');

let stripeClient;

const getStripeClient = () => {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured: set STRIPE_SECRET_KEY');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
};

const toMinorUnit = (amount) => {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Amount must be a positive number');
  }

  return Math.round(parsed * 100);
};

const createPaymentIntent = async ({ amount, currency, description, metadata }) => {
  const stripe = getStripeClient();

  return stripe.paymentIntents.create({
    amount: toMinorUnit(amount),
    currency: (currency || env.STRIPE_CURRENCY || 'usd').toLowerCase(),
    description,
    metadata,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'never'
    }
  });
};

const retrievePaymentIntent = async (paymentIntentId) => {
  const stripe = getStripeClient();
  return stripe.paymentIntents.retrieve(paymentIntentId);
};

const confirmPaymentIntent = async ({ paymentIntentId, paymentMethod }) => {
  const stripe = getStripeClient();
  return stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method: paymentMethod
  });
};

module.exports = {
  createPaymentIntent,
  retrievePaymentIntent,
  confirmPaymentIntent
};
