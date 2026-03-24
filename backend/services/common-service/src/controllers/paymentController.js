const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');
const { createPaymentIntent, retrievePaymentIntent, confirmPaymentIntent } = require('../services/paymentService');
const { env } = require('../config/env');

const createPaymentIntentSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  currency: Joi.string().length(3).optional(),
  description: Joi.string().max(200).allow('').optional(),
  appointmentId: Joi.string().allow('').optional()
});

const paymentIntentIdSchema = Joi.object({
  paymentIntentId: Joi.string().required()
});

const confirmIntentSchema = Joi.object({
  paymentMethod: Joi.string().required()
});

const createIntent = asyncHandler(async (req, res) => {
  const { error, value } = createPaymentIntentSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const intent = await createPaymentIntent({
    amount: value.amount,
    currency: value.currency || env.STRIPE_CURRENCY,
    description: value.description,
    metadata: {
      userId: req.user.id,
      userRole: req.user.role,
      appointmentId: value.appointmentId || ''
    }
  });

  return res.status(StatusCodes.OK).json({
    message: 'Payment intent created',
    data: {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      status: intent.status,
      amount: intent.amount,
      currency: intent.currency,
      publishableKey: env.STRIPE_PUBLISHABLE_KEY || null
    }
  });
});

const getIntent = asyncHandler(async (req, res) => {
  const { error, value } = paymentIntentIdSchema.validate(req.params, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const intent = await retrievePaymentIntent(value.paymentIntentId);

  return res.status(StatusCodes.OK).json({
    message: 'Payment intent fetched',
    data: {
      paymentIntentId: intent.id,
      status: intent.status,
      amount: intent.amount,
      currency: intent.currency,
      created: intent.created,
      metadata: intent.metadata
    }
  });
});

const confirmIntent = asyncHandler(async (req, res) => {
  const { error: paramsError, value: paramsValue } = paymentIntentIdSchema.validate(req.params, {
    abortEarly: false,
    stripUnknown: true
  });

  if (paramsError) {
    throw new ApiError(StatusCodes.BAD_REQUEST, paramsError.details.map((d) => d.message).join(', '));
  }

  const { error: bodyError, value: bodyValue } = confirmIntentSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (bodyError) {
    throw new ApiError(StatusCodes.BAD_REQUEST, bodyError.details.map((d) => d.message).join(', '));
  }

  const intent = await confirmPaymentIntent({
    paymentIntentId: paramsValue.paymentIntentId,
    paymentMethod: bodyValue.paymentMethod
  });

  return res.status(StatusCodes.OK).json({
    message: 'Payment intent confirmed',
    data: {
      paymentIntentId: intent.id,
      status: intent.status,
      amount: intent.amount,
      currency: intent.currency
    }
  });
});

module.exports = {
  createIntent,
  getIntent,
  confirmIntent
};
