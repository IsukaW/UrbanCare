const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');
const { getDoctors, getDoctorById, getAvailableSlots } = require('../services/doctorClient');


function getMondayOfWeek(dateStr) {
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; 
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

const listDoctors = asyncHandler(async (req, res) => {
  const { specialty } = req.query;
  const doctors = await getDoctors({
    authorization: req.headers.authorization,
    specialty
  });
  return res.status(StatusCodes.OK).json(doctors);
});

const getDoctorProfile = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  try {
    const doctor = await getDoctorById({
      doctorId,
      authorization: req.headers.authorization
    });
    return res.status(StatusCodes.OK).json(doctor);
  } catch (error) {
    const code = error.statusCode || StatusCodes.NOT_FOUND;
    throw new ApiError(code, error.message);
  }
});

const getDoctorAvailableSlots = asyncHandler(async (req, res) => {
  const schema = Joi.object({
    date: Joi.date().iso().required()
  });

  const { error, value } = schema.validate(req.query, { abortEarly: false });
  if (error) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      error.details.map((d) => d.message).join(', ')
    );
  }

  const { doctorId } = req.params;
  const dateStr = value.date.toISOString().split('T')[0]; 
  const weekStartMonday = getMondayOfWeek(dateStr);

  const weeklyAvailability = await getAvailableSlots({
    doctorId,
    weekStartMonday,
    authorization: req.headers.authorization
  });

  const slotsForDate = weeklyAvailability.filter((slot) => slot.date === dateStr);

  return res.status(StatusCodes.OK).json({
    doctorId,
    date: dateStr,
    weekStartMonday,
    slots: slotsForDate,
    isAvailable: slotsForDate.some((s) => (s.availableTokens ?? (s.maxTokens - s.reservedTokens)) > 0)
  });
});

module.exports = { listDoctors, getDoctorProfile, getDoctorAvailableSlots };
