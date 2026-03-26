const { RtcTokenBuilder, RtcRole } = require('agora-token');
const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');

// Convert a MongoDB ObjectId hex string to a uint32 for Agora uid.
// Uses djb2 hash to produce a stable, non-zero 32-bit unsigned integer.
const objectIdToUid = (objectIdStr) => {
  let hash = 5381;
  for (let i = 0; i < objectIdStr.length; i++) {
    hash = ((hash << 5) + hash + objectIdStr.charCodeAt(i)) >>> 0; // keep uint32
  }
  // Agora uid 0 is reserved (auto-assign), so ensure result is >= 1
  return hash === 0 ? 1 : hash;
};

const generateRtcToken = ({ channelName, uid, role = 'publisher' }) => {
  if (!env.AGORA_APP_ID || !env.AGORA_APP_CERTIFICATE) {
    throw new ApiError(StatusCodes.SERVICE_UNAVAILABLE, 'Agora is not configured on this server');
  }

  const agoraRole = role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
  const tokenExpiry = env.AGORA_TOKEN_EXPIRY_SECONDS;
  const expiresAt = new Date(Date.now() + tokenExpiry * 1000).toISOString();

  const token = RtcTokenBuilder.buildTokenWithUid(
    env.AGORA_APP_ID,
    env.AGORA_APP_CERTIFICATE,
    channelName,
    uid,
    agoraRole,
    tokenExpiry
  );

  return { token, expiresAt };
};

module.exports = { generateRtcToken, objectIdToUid };
