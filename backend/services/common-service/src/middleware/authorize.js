const { StatusCodes } = require('http-status-codes');
const ApiError = require('../utils/ApiError');

const authorize = (...allowedRoles) => (req, _res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(new ApiError(StatusCodes.FORBIDDEN, 'Access denied'));
  }

  return next();
};

module.exports = { authorize };
