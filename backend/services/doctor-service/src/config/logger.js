const pino = require('pino');
const { env } = require('./env');

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: { service: 'doctor-service' }
});

module.exports = logger;
