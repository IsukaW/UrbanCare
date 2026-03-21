const pino = require('pino');
const { env } = require('./env');

const loggerOptions = {
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: { service: 'doctor-service' }
};

const prettyInTerminal = process.stdout.isTTY;
const forcePretty = process.env.LOG_PRETTY === 'true';

if (env.NODE_ENV !== 'production' || prettyInTerminal || forcePretty) {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      singleLine: false,
      ignore: 'pid,hostname',
      errorLikeObjectKeys: ['err', 'error']
    }
  };
}

const logger = pino(loggerOptions);

module.exports = logger;
