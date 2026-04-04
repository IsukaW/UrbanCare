const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');
const { analyseSymptoms } = require('../services/symptomCheckerService');

const symptomSchema = Joi.object({
  symptoms: Joi.array()
    .items(Joi.string().min(2).max(200))
    .min(1)
    .max(10)
    .required()
});

const analyseSymptomHandler = asyncHandler(async (req, res) => {
  const { error, value } = symptomSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      error.details.map((d) => d.message).join(', ')
    );
  }

  const result = await analyseSymptoms(value.symptoms);

  return res.status(StatusCodes.OK).json(result);
});

module.exports = { analyseSymptomHandler };