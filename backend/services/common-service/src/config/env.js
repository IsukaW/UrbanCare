const dotenv = require('dotenv');
const Joi = require('joi');

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('production'),
  PORT: Joi.number().port().default(5001),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  SMSAPI_LK_TOKEN: Joi.string().allow('', null),
  SMSAPI_LK_SENDER_ID: Joi.string().allow('', null),
  SMSAPI_LK_MESSAGE_TYPE: Joi.string().valid('plain', 'unicode').required(),
  SMSAPI_LK_BASE_URL: Joi.string().uri().required(),
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
  SMSAPI_LK_TOKEN: value.SMSAPI_LK_TOKEN,
  SMSAPI_LK_SENDER_ID: value.SMSAPI_LK_SENDER_ID,
  SMSAPI_LK_MESSAGE_TYPE: value.SMSAPI_LK_MESSAGE_TYPE,
  SMSAPI_LK_BASE_URL: value.SMSAPI_LK_BASE_URL,
  BREVO_SMTP_LOGIN: value.BREVO_SMTP_LOGIN,
  SENDGRID_API_KEY: value.SENDGRID_API_KEY,
  SENDGRID_FROM_NAME: value.SENDGRID_FROM_NAME,
  SENDGRID_FROM_EMAIL: value.SENDGRID_FROM_EMAIL
};

module.exports = { env };
