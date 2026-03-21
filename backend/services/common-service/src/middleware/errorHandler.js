const { StatusCodes } = require('http-status-codes');
const logger = require('../config/logger');

const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  logger.error({ err, path: req.path, method: req.method }, 'Request failed');

  res.status(statusCode).json({
    message: err.message || 'Internal server error'
  });
};

module.exports = { errorHandler };
