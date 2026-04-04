const dotenv = require('dotenv');
const Joi = require('joi');

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('production'),
  PORT: Joi.number().port().default(5004),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  COMMON_SERVICE_URL: Joi.string().uri().required(),
  GOOGLE_API_KEY: Joi.string().required()
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
  COMMON_SERVICE_URL: value.COMMON_SERVICE_URL,
  GOOGLE_API_KEY: value.GOOGLE_API_KEY
};

module.exports = { env };