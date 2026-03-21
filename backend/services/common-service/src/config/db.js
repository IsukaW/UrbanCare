const mongoose = require('mongoose');
const { env } = require('./env');
const logger = require('./logger');

const connectDatabase = async () => {
  await mongoose.connect(env.DATABASE_URL, {
    autoIndex: false
  });
  logger.info('Connected to common-service database');
};

module.exports = { connectDatabase };
