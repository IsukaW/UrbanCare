const express = require('express');
const { register, login, forgotPassword, verifyResetCode, resetPassword } = require('../controllers/authController');
const { createRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Limit OTP-related endpoints to 5 requests per 15 minutes per IP
const otpLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset attempts. Please try again in 15 minutes.'
});

router.post('/register', register);
router.post('/login', login);

router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/verify-code', otpLimiter, verifyResetCode);
router.post('/reset-password', resetPassword);

module.exports = router;
