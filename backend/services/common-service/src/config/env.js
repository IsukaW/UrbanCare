const dotenv = require('dotenv');
const Joi = require('joi');

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('production'),
  PORT: Joi.number().port().default(5001),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  TWILIO_API_KEY: Joi.string().allow('', null),
  TWILIO_API_SECRET: Joi.string().allow('', null),
  TWILIO_ACCOUNT_SID: Joi.string().allow('', null),
  TWILIO_FROM_NUMBER: Joi.string().allow('', null),
  BREVO_SMTP_LOGIN: Joi.string().allow('', null),
  SENDGRID_API_KEY: Joi.string().allow('', null),
  SENDGRID_FROM_NAME: Joi.string().allow('', null),
  SENDGRID_FROM_EMAIL: Joi.string().email().allow('', null)
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
  TWILIO_API_KEY: value.TWILIO_API_KEY,
  TWILIO_API_SECRET: value.TWILIO_API_SECRET,
  TWILIO_ACCOUNT_SID: value.TWILIO_ACCOUNT_SID,
  TWILIO_FROM_NUMBER: value.TWILIO_FROM_NUMBER,
  BREVO_SMTP_LOGIN: value.BREVO_SMTP_LOGIN,
  SENDGRID_API_KEY: value.SENDGRID_API_KEY,
  SENDGRID_FROM_NAME: value.SENDGRID_FROM_NAME,
  SENDGRID_FROM_EMAIL: value.SENDGRID_FROM_EMAIL
};

module.exports = { env };
