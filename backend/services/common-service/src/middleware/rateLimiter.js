/**
 * Lightweight in-memory rate limiter.
 * Uses a Map keyed by IP address; entries auto-expire after the window.
 *
 * @param {object} options
 * @param {number} options.windowMs   - Rolling window in milliseconds (default 15 min)
 * @param {number} options.max        - Max requests per window per IP (default 5)
 * @param {string} options.message    - Error message when limit is hit
 */
const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 5,
  message = 'Too many requests, please try again later.'
} = {}) => {
  // Map<ip, { count: number, resetAt: number }>
  const store = new Map();

  // Periodically clean up expired entries to avoid memory leaks
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now >= record.resetAt) store.delete(key);
    }
  }, windowMs);

  // Allow the process to exit even if this interval is still active
  if (cleanup.unref) cleanup.unref();

  return (req, res, next) => {
    const ip =
      req.ip ||
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      'unknown';

    const now = Date.now();
    const record = store.get(ip);

    if (!record || now >= record.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    record.count += 1;
    if (record.count > max) {
      return res.status(429).json({ message });
    }

    return next();
  };
};

module.exports = { createRateLimiter };
