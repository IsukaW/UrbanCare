const { env } = require('../config/env');

const securityHeaderKeys = [
  'content-security-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
  'origin-agent-cluster',
  'referrer-policy',
  'strict-transport-security',
  'x-content-type-options',
  'x-dns-prefetch-control',
  'x-download-options'
];

const formatHeaders = (headers) => {
  const formatted = {};

  for (const key of securityHeaderKeys) {
    const rawValue = headers[key];
    if (!rawValue) {
      continue;
    }

    const value = Array.isArray(rawValue) ? rawValue.join('; ') : String(rawValue);

    if (key === 'content-security-policy') {
      formatted[key] = value
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean);
    } else {
      formatted[key] = value;
    }
  }

  return formatted;
};

const logSecurityHeaders = (req, res, next) => {
  if (env.NODE_ENV === 'production') {
    return next();
  }

  res.on('finish', () => {
    const formatted = formatHeaders(res.getHeaders());
    if (Object.keys(formatted).length === 0) {
      return;
    }

    req.log.info(
      {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        securityHeaders: formatted
      },
      'Response security headers'
    );
  });

  return next();
};

module.exports = { logSecurityHeaders };
