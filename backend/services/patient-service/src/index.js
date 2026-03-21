const app = require('./app');
const { connectDatabase } = require('./config/db');
const { env } = require('./config/env');
const logger = require('./config/logger');

const start = async () => {
  try {
    await connectDatabase();
    app.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, 'Patient service started');
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start patient service');
    process.exit(1);
  }
};

start();
