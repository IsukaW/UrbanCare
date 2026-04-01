const dotenv = require('dotenv');
const Joi = require('joi');

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('production'),
  PORT: Joi.number().port().default(5003),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  /** Base URL of common-service (for POST /notify/email using the admin’s Bearer token) */
  COMMON_SERVICE_URL: Joi.string().uri().default('http://localhost:5001'),
  /** Optional direct SMTP delivery (Brevo SMTP supported) */
  BREVO_SMTP_LOGIN: Joi.string().allow('').optional(),
  SENDGRID_API_KEY: Joi.string().allow('').optional(),
  SENDGRID_FROM_NAME: Joi.string().allow('').optional(),
  SENDGRID_FROM_EMAIL: Joi.string().email().allow('').optional()
})
  .unknown()
  .required();

const { value, error } = schema.validate(process.env, { abortEarly: false });

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

const env = {
  NODE_ENV: value.NODE_ENV,
  PORT: value.PORT,
  DATABASE_URL: value.DATABASE_URL,
  JWT_SECRET: value.JWT_SECRET,
  JWT_EXPIRES_IN: value.JWT_EXPIRES_IN,
  COMMON_SERVICE_URL: value.COMMON_SERVICE_URL,
  BREVO_SMTP_LOGIN: value.BREVO_SMTP_LOGIN || '',
  SENDGRID_API_KEY: value.SENDGRID_API_KEY || '',
  SENDGRID_FROM_NAME: value.SENDGRID_FROM_NAME || '',
  SENDGRID_FROM_EMAIL: value.SENDGRID_FROM_EMAIL || ''
};

module.exports = { env };
