const { StatusCodes } = require('http-status-codes');
const ApiError = require('../utils/ApiError');

const validate = (schema, source = 'body') => (req, _res, next) => {
  const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });

  if (error) {
    return next(new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', ')));
  }

  req[source] = value;
  return next();
};

module.exports = { validate };
