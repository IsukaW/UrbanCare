const { StatusCodes } = require('http-status-codes');
const ApiError = require('./ApiError');

/** Decoded image bytes cap (keeps DB documents and responses bounded). */
const DEFAULT_MAX_BYTES = 400 * 1024;

const HEADER_RE = /^data:image\/(jpeg|jpg|png|webp|gif);base64$/i;

/**
 * Validates a profile image sent as a data URL and returns a normalized string for storage.
 * Empty string clears the photo.
 */
function parseProfilePhotoDataUrl(input, maxBytes = DEFAULT_MAX_BYTES) {
  if (input === undefined) {
    return undefined;
  }
  if (input === null || input === '') {
    return '';
  }
  if (typeof input !== 'string') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'profilePhoto must be a string data URL or empty');
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return '';
  }

  const comma = trimmed.indexOf(',');
  if (comma < 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'profilePhoto must be a data URL: data:image/(jpeg|png|webp|gif);base64,...'
    );
  }
  const header = trimmed.slice(0, comma);
  const b64 = trimmed.slice(comma + 1).replace(/\s/g, '');
  const hm = HEADER_RE.exec(header);
  if (!hm) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'profilePhoto must be a data URL: data:image/(jpeg|png|webp|gif);base64,...'
    );
  }

  let buf;
  try {
    buf = Buffer.from(b64, 'base64');
  } catch {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'profilePhoto base64 is invalid');
  }

  if (buf.length > maxBytes) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `profilePhoto image is too large (max ${Math.floor(maxBytes / 1024)}KB decoded)`
    );
  }

  if (buf.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'profilePhoto image is empty');
  }

  const mime = hm[1].toLowerCase();
  const normalizedMime = mime === 'jpg' ? 'jpeg' : mime;
  return `data:image/${normalizedMime};base64,${buf.toString('base64')}`;
}

module.exports = {
  parseProfilePhotoDataUrl,
  DEFAULT_MAX_BYTES
};
