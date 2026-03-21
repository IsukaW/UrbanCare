const pino = require('pino');
const { env } = require('./env');

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: { service: 'appointment-service' }
});

module.exports = logger;
