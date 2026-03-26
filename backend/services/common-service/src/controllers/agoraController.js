const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');
const { generateRtcToken, objectIdToUid } = require('../services/agoraService');
const { asyncHandler } = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { env } = require('../config/env');

const tokenSchema = Joi.object({
  channelName: Joi.string()
    .pattern(/^[a-zA-Z0-9!#$%&()+\-:;<=.>?@[\]^_{|}~,]+$/)
    .min(1)
    .max(64)
    .required(),
  role: Joi.string().valid('publisher', 'subscriber').default('publisher')
});

const getToken = asyncHandler(async (req, res) => {
  const { error, value } = tokenSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  // Derive a stable uint32 uid from the authenticated user's MongoDB ObjectId
  const uid = objectIdToUid(req.user.id);

  const { token, expiresAt } = generateRtcToken({ ...value, uid });

  return res.status(StatusCodes.OK).json({
    appId: env.AGORA_APP_ID,
    token,
    channelName: value.channelName,
    uid,
    role: value.role,
    expiresAt
  });
});

module.exports = { getToken };
