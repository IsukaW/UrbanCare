const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');
const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');
const {
  sendAppointmentConfirmationNotification,
  sendAppointmentStatusNotification,
  sendCancellationRequestNotification,
  getDoctorDocuments,
  getPatientDocuments
} = require('../services/commonServiceClient');
const { getDoctors, getDoctorById, getDoctorSchedule, getAvailableSlots, reserveSlot, releaseSlot, getDoctorPrescriptions } = require('../services/doctorClient');
const { getPatientById, getPatientMedicalDocuments } = require('../services/patientClient');
const { processPayment, getPaymentStatus } = require('../services/paymentClient');

//validation schemas

const searchSchema = Joi.object({
  specialty: Joi.string().min(2).max(100).optional(),
  date: Joi.date().iso().optional()
});

const bookAppointmentSchema = Joi.object({
  patientId: Joi.string().required(),
  doctorId: Joi.string().required(),
  slotId: Joi.string().required(),
  type: Joi.string().valid('video', 'in-person').required(),
  reason: Joi.string().min(3).max(500).required(),
  patientEmail: Joi.string().email().optional(),
  patientPhoneNumber: Joi.string().optional()
  ,
  autoPay: Joi.boolean().optional()
});

const updateAppointmentSchema = Joi.object({
  slotId: Joi.string().optional(),
  reason: Joi.string().min(3).max(500).optional(),
  type: Joi.string().valid('video', 'in-person').optional(),
  status: Joi.string().valid('pending', 'confirmed', 'completed').optional()
}).min(1);

const requestCancellationSchema = Joi.object({
  reason: Joi.string().min(3).max(500).required()
});

const approveCancellationSchema = Joi.object({
  approvalStatus: Joi.string().valid('approve_cancellation', 'offer_reschedule').required(),
  adminNotes: Joi.string().max(500).optional(),
  // For reschedule offer - only slotId needed, date auto-derived from slot
  alternativeSlotId: Joi.string().when('approvalStatus', { is: 'offer_reschedule', then: Joi.required() }),
  alternativeDoctorId: Joi.string().when('approvalStatus', { is: 'offer_reschedule', then: Joi.optional() })
});

const offerRescheduleSchema = Joi.object({
  alternativeSlotId: Joi.string().required(),
  alternativeDoctorId: Joi.string().optional(),
  adminNotes: Joi.string().max(500).optional()
});

const listAppointmentSchema = Joi.object({
  patientId: Joi.string().optional(),
  doctorId: Joi.string().optional(),
  status: Joi.string()
    .valid('pending', 'confirmed', 'completed', 'cancelled', 'cancellation_requested', 'rescheduled')
    .optional()
});

//helper functions

const canAccessAppointment = (user, appointment) =>
  user.role === 'admin' || user.id === appointment.patientId || user.id === appointment.doctorId;

const generateTokenNumber = (weekStartMonday, tokenCount) => {
  const weekStr = weekStartMonday.replace(/-/g, '');
  const tokenStr = String(tokenCount || 1).padStart(3, '0');
  return `UC-${weekStr}-${tokenStr}`;
};

 //Search for available doctors with optional filters
 //GET /appointments/search?specialty=&date=

const searchDoctors = asyncHandler(async (req, res) => {
  const { error, value } = searchSchema.validate(req.query, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const authorization = req.headers.authorization;
  if (!authorization) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Authorization header required');
  }

  try {
    // 1. Fetch all doctors from doctor-service
    let doctors = await getDoctors({ authorization });

    // 2. Filter by specialization if provided
    if (value.specialty) {
      doctors = doctors.filter((doctor) =>
        doctor.specialization.toLowerCase().includes(value.specialty.toLowerCase())
      );

      // Check if any doctors found for the requested specialty
      if (doctors.length === 0) {
        throw new ApiError(StatusCodes.NOT_FOUND, `No doctors found with specialty: ${value.specialty}`);
      }
    }

    // 3. If date is provided, get available slots for that specific date
    let result = doctors;
    if (value.date) {
      // Convert date to Monday of that week (weekStartMonday format)
      const date = value.date instanceof Date ? value.date : new Date(value.date);
      const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, etc
      const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(date);
      monday.setDate(monday.getDate() + offset);
      monday.setHours(0, 0, 0, 0);
      const y = monday.getFullYear();
      const m = String(monday.getMonth() + 1).padStart(2, '0');
      const dd = String(monday.getDate()).padStart(2, '0');
      const weekStartMonday = `${y}-${m}-${dd}`;

      console.log(`[SEARCH] Requested date: ${date.toISOString()}, dayOfWeek: ${dayOfWeek}, weekStartMonday: ${weekStartMonday}`);

      // Fetch available slots for each doctor for that week
      const doctorsWithSlots = await Promise.all(
        doctors.map(async (doctor) => {
          try {
            const availableData = await getAvailableSlots({
              doctorId: doctor._id,
              weekStartMonday,
              authorization
            });

            console.log(`[SEARCH] Doctor ${doctor._id} raw slots data:`, JSON.stringify(availableData, null, 2));

            // Return ALL slots for the week, grouped by date
            const slotsByDate = {};
            const weeklyAvailability = availableData || [];

            if (Array.isArray(weeklyAvailability)) {
              weeklyAvailability.forEach((week) => {
                if (Array.isArray(week.slots)) {
                  week.slots.forEach((slot) => {
                    const availableTokens = slot.availableTokens || ((slot.maxTokens || 0) - (slot.reservedTokens || 0));
                    console.log(`[SEARCH] Slot ${slot.slotId}: date=${slot.date}, availableTokens=${availableTokens}`);
                    
                    if (availableTokens > 0) {
                      const dateStr = slot.date || 'Unknown Date';
                      if (!slotsByDate[dateStr]) {
                        slotsByDate[dateStr] = [];
                      }
                      slotsByDate[dateStr].push({
                        slotId: slot.slotId,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        maxTokens: slot.maxTokens,
                        reservedTokens: slot.reservedTokens,
                        availableTokens: availableTokens
                      });
                    }
                  });
                }
              });
            }

            console.log(`[SEARCH] Doctor ${doctor._id} slots by date:`, slotsByDate);

            // If a specific date was requested, filter to only show slots for that date
            const requestedDateStr = date.toISOString().split('T')[0];
            const filteredSlots = value.date 
              ? { [requestedDateStr]: slotsByDate[requestedDateStr] || [] }
              : slotsByDate;

            return {
              ...doctor,
              requestedDate: requestedDateStr,
              weekStartMonday,
              slotsByDate: filteredSlots,
              allWeekSlots: filteredSlots
            };
          } catch (error) {
            console.error(`Failed to get slots for doctor ${doctor._id}:`, error.message);
            return {
              ...doctor,
              requestedDate: date.toISOString().split('T')[0],
              weekStartMonday,
              slotsByDate: {},
              allWeekSlots: {}
            };
          }
        })
      );

      result = doctorsWithSlots;
    }

    // 5. Check if result is empty
    if (result.length === 0) {
      const filters = [];
      if (value.specialty) filters.push(`specialty: ${value.specialty}`);
      if (value.date) filters.push(`date: ${value.date.toISOString().split('T')[0]}`);
      const filterStr = filters.length > 0 ? ` with ${filters.join(' and ')}` : '';
      throw new ApiError(StatusCodes.NOT_FOUND, `No doctors available${filterStr}`);
    }

    // 6. If date was requested, verify at least one doctor has slots for that specific date
    if (value.date) {
      const requestedDateStr = value.date.toISOString().split('T')[0];
      const hasAvailableSlots = result.some(doctor => 
        doctor.slotsByDate && 
        doctor.slotsByDate[requestedDateStr] && 
        doctor.slotsByDate[requestedDateStr].length > 0
      );

      if (!hasAvailableSlots) {
        const specialty = value.specialty ? ` with specialty ${value.specialty}` : '';
        throw new ApiError(StatusCodes.NOT_FOUND, `No available slots${specialty} on ${requestedDateStr}`);
      }
    }

    // 7. Format response
    const formattedDoctors = result.map((doctor) => ({
      _id: doctor._id,
      fullName: doctor.fullName,
      specialization: doctor.specialization,
      qualifications: doctor.qualifications || [],
      yearsOfExperience: doctor.yearsOfExperience || 0,
      profilePhotoDocumentId: doctor.profilePhotoDocumentId || null,
      ...(value.date && {
        requestedDate: doctor.requestedDate,
        weekStartMonday: doctor.weekStartMonday,
        slotsByDate: doctor.slotsByDate || {}  // All slots grouped by date (YYYY-MM-DD)
      })
    }));

    return res.status(StatusCodes.OK).json(formattedDoctors);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(StatusCodes.BAD_GATEWAY, `Failed to search doctors: ${error.message}`);
  }
});

 //Book an appointment
 //POST /appointments
 
const bookAppointment = asyncHandler(async (req, res) => {
  const { error, value } = bookAppointmentSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  // Authorization: patients can only book for themselves
  if (req.user.role === 'patient' && req.user.id !== value.patientId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Patients can only book their own appointments');
  }

  const authorization = req.headers.authorization;
  if (!authorization) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Authorization header required');
  }

  try {
    // 1. Verify doctor exists and get details
    let doctorDetails;
    try {
      doctorDetails = await getDoctorById({
        doctorId: value.doctorId,
        authorization
      });
      if (!doctorDetails.fullName || !doctorDetails.specialization) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Doctor profile is incomplete');
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(StatusCodes.NOT_FOUND, 'Doctor not found');
    }

    // 2. Verify patient exists (non-critical - JWT authentication already validates user exists)
    try {
      await getPatientById({
        patientId: value.patientId,
        authorization
      });
    } catch (error) {
      // Non-critical - patient profile may not exist in patient-service yet
      console.warn('Patient profile not found in patient-service:', error.message);
    }

    // 3. Verify slot is available and auto-derive scheduledAt from slot details
    let weekStartMonday;
    let slotDate;
    let slotStartTime;
    let reservedTokens = 0;
    let slotMaxTokens = 0;
    try {
      // Fetch all available slots for the doctor (no filtering by week for now - get all)
      const doctorSchedule = await getDoctorSchedule({
        doctorId: value.doctorId,
        authorization
      });

      // Find the slot in weekly availability
      let slotFound = false;
      const weeklyAvailability = doctorSchedule.weeklyAvailability || [];
      
      if (Array.isArray(weeklyAvailability)) {
        for (const weekEntry of weeklyAvailability) {
          if (Array.isArray(weekEntry.slots)) {
            const slot = weekEntry.slots.find((s) => s.slotId === value.slotId);
            if (slot && slot.maxTokens && (slot.maxTokens - (slot.reservedTokens || 0)) > 0) {
              slotFound = true;
              slotDate = slot.date; // e.g., "2026-04-14"
              slotStartTime = slot.startTime; // e.g., "14:00"
              reservedTokens = slot.reservedTokens || 0;
              slotMaxTokens = slot.maxTokens;
              weekStartMonday = weekEntry.weekStartMonday;
              break;
            }
          }
        }
      }

      if (!slotFound) {
        throw new ApiError(StatusCodes.CONFLICT, 'Selected slot is not available');
      }

      // AUTO-DERIVE scheduledAt from slot date and start time
      const scheduledAt = new Date(`${slotDate}T${slotStartTime}:00Z`);
      value.scheduledAt = scheduledAt;

    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(StatusCodes.BAD_GATEWAY, `Failed to verify slot availability: ${err.message}`);
    }

    // 4. Generate appointment token (with week date and token number 1-20)
    const tokenCount = reservedTokens + 1; // Next available token number (1-20)
    const tokenNumber = generateTokenNumber(weekStartMonday, tokenCount);

    // 5. Create appointment in database
    const appointment = await Appointment.create({
      patientId: value.patientId,
      doctorId: value.doctorId,
      doctorName: doctorDetails.fullName,
      doctorSpecialty: doctorDetails.specialization,
      slotId: value.slotId,
      type: value.type,
      scheduledAt: value.scheduledAt,
      tokenNumber,
      reason: value.reason,
      status: 'pending',
      paymentStatus: 'pending',
      createdBy: req.user.id,
      updatedBy: req.user.id,
      doctorPrescriptionIds: [], // Will be populated in step 8
      patientMedicalDocumentIds: [] // Will be populated in step 9
    });

    // 6. Reserve slot in doctor-service
    try {
      await reserveSlot({
        doctorId: value.doctorId,
        slotId: value.slotId,
        authorization
      });
    } catch (error) {
      // If reservation fails, attempt to clean up the appointment
      await Appointment.findByIdAndDelete(appointment._id);
      throw new ApiError(StatusCodes.CONFLICT, `Failed to reserve slot - slot may be fully booked: ${error.message}`);
    }

    // 7. Optionally process payment for the appointment (default: skip payment here)
    let paymentRecord = null;
    if (value.autoPay) {
      try {
        paymentRecord = await processPayment({
          appointmentId: appointment._id.toString(),
          amount: 500, // Default amount - can be parameterized
          patientId: value.patientId,
          doctorId: value.doctorId,
          paymentMethod: 'online', // Default method
          authorization
        });

        // Common-service returns { message, data: { status, paymentIntentId, clientSecret, ... } }
        const respData = paymentRecord?.data || paymentRecord?.data || paymentRecord;
        const statusVal = (respData && respData.status) || (respData && respData.data && respData.data.status) || null;

        if (statusVal && ['paid', 'succeeded', 'success'].includes(statusVal.toLowerCase())) {
          appointment.paymentStatus = 'paid';
          appointment.status = 'confirmed'; // AUTO-CONFIRM after successful payment
          await appointment.save();

          // Send confirmation notification to patient
          try {
            await sendAppointmentStatusNotification({
              email: value.patientEmail,
              appointmentId: appointment._id.toString(),
              status: 'confirmed',
              message: `Your appointment with Dr. ${doctorDetails.fullName} has been confirmed. Your token number is ${tokenNumber}. Scheduled for ${appointment.scheduledAt.toISOString()}`,
              authorization
            });
          } catch (notifyError) {
            console.error('Failed to send confirmation notification:', notifyError);
          }
        } else {
          appointment.paymentStatus = (statusVal && statusVal.toLowerCase()) || 'pending';
          await appointment.save();
        }
      } catch (error) {
        console.error('Payment processing failed:', error.message);
        // If autoPay fails, delete appointment and bubble error
        await Appointment.findByIdAndDelete(appointment._id);
        throw new ApiError(StatusCodes.PAYMENT_REQUIRED, `Payment processing failed: ${error.message}`);
      }
    } else {
      // No auto payment requested: leave paymentStatus as 'pending' and return appointment id to caller
      await appointment.save();
    }

    // 8. Get and store doctor's prescriptions if available (optional)
    try {
      const doctorPrescriptions = await getDoctorPrescriptions({
        doctorId: value.doctorId,
        appointmentId: appointment._id.toString(),
        authorization
      });
      if (doctorPrescriptions.length > 0) {
        // Store prescription IDs for reference
        appointment.doctorPrescriptionIds = doctorPrescriptions.map((p) => p._id || p.id);
      }
    } catch (error) {
      console.error('Failed to fetch doctor prescriptions:', error);
      // Non-critical - continue even if prescriptions not available
    }

    // 9. Get and store patient's medical documents if available (optional)
    try {
      const patientDocuments = await getPatientMedicalDocuments({
        patientId: value.patientId,
        authorization
      });
      if (patientDocuments.length > 0) {
        // Store document IDs for reference
        appointment.patientMedicalDocumentIds = patientDocuments.map((d) => d._id || d.id);
      }
    } catch (error) {
      // Non-critical - continue even if documents fail
      console.error('Failed to fetch patient medical documents:', error);
    }

    // Save appointment with references
    await appointment.save();

    // 10. Send appointment confirmation notification (non-critical)
    try {
      await sendAppointmentConfirmationNotification({
        email: value.patientEmail,
        phoneNumber: value.patientPhoneNumber,
        appointmentId: appointment._id.toString(),
        scheduledAt: appointment.scheduledAt.toISOString(),
        doctorName: doctorDetails.fullName,
        doctorSpecialty: doctorDetails.specialization,
        tokenNumber,
        type: appointment.type,
        authorization
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }

    // 11. Return appointment with details
    const response = {
      ...appointment.toObject(),
      doctorDetails: {
        _id: doctorDetails._id,
        fullName: doctorDetails.fullName,
        specialization: doctorDetails.specialization,
        qualifications: doctorDetails.qualifications,
        yearsOfExperience: doctorDetails.yearsOfExperience,
        profilePhotoDocumentId: doctorDetails.profilePhotoDocumentId
      },
      paymentRecord: paymentRecord ? {
        transactionId: paymentRecord.transactionId,
        status: paymentRecord.status,
        amount: paymentRecord.amount
      } : null
    };

    return res.status(StatusCodes.CREATED).json(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(StatusCodes.BAD_GATEWAY, `Failed to book appointment: ${error.message}`);
  }
});

 //List appointments with role-based filtering
 //GET /appointments?patientId=&doctorId=&status=

const listAppointments = asyncHandler(async (req, res) => {
  const { error, value } = listAppointmentSchema.validate(req.query, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const query = {};

  // Authorization and filtering logic
  if (value.patientId) {
    if (req.user.role === 'patient' && req.user.id !== value.patientId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Patients can only view their own appointments');
    }
    query.patientId = value.patientId;
  } else if (value.doctorId) {
    if (req.user.role === 'doctor' && req.user.id !== value.doctorId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Doctors can only view their own appointments');
    }
    query.doctorId = value.doctorId;
  } else if (req.user.role === 'patient') {
    // Patient requesting without filter sees only their own
    query.patientId = req.user.id;
  } else if (req.user.role === 'doctor') {
    // Doctor requesting without filter sees only their own
    query.doctorId = req.user.id;
  }
  // Admin with no filters can see all

  if (value.status) {
    query.status = value.status;
  }

  const appointments = await Appointment.find(query)
    .sort({ scheduledAt: -1 })
    .lean();

  return res.status(StatusCodes.OK).json(appointments);
});


 //Get appointment details by ID
 //GET /appointments/{id}

const getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id).lean();
  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  if (!canAccessAppointment(req.user, appointment)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have access to this appointment');
  }

  return res.status(StatusCodes.OK).json(appointment);
});

 //Get appointment status
 //GET /appointments/{id}/status

const getAppointmentStatus = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id).lean();
  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  if (!canAccessAppointment(req.user, appointment)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have access to this appointment');
  }

  return res.status(StatusCodes.OK).json({
    appointmentId: appointment._id,
    status: appointment.status,
    paymentStatus: appointment.paymentStatus,
    tokenNumber: appointment.tokenNumber,
    scheduledAt: appointment.scheduledAt,
    doctorName: appointment.doctorName,
    doctorSpecialty: appointment.doctorSpecialty
  });
});


//Update appointment details (date, time, reason)
//PUT /appointments/{id}
//Only allowed for pending/confirmed appointments

const updateAppointment = asyncHandler(async (req, res) => {
  const { error, value } = updateAppointmentSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  if (!canAccessAppointment(req.user, appointment)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have access to this appointment');
  }

  // Only allow updates for pending/confirmed appointments
  if (!['pending', 'confirmed'].includes(appointment.status)) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      `Cannot update appointment with status "${appointment.status}"`
    );
  }

  const authorization = req.headers.authorization;

  // If slotId is provided, validate payment and doctor confirmation status
  if (value.slotId) {
    // Check if payment is already made
    if (appointment.paymentStatus === 'paid') {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'Cannot change slot after payment is made. Please contact admin for paid appointment changes.'
      );
    }

    // Check if doctor already confirmed (status === 'confirmed')
    if (appointment.status === 'confirmed') {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'Cannot change slot after doctor has confirmed the appointment.'
      );
    }

    try {
      const doctorSchedule = await getDoctorSchedule({
        doctorId: appointment.doctorId,
        authorization
      });

      // Find the slot in weekly availability
      let slotFound = false;
      const weeklyAvailability = doctorSchedule.weeklyAvailability || [];
      
      if (Array.isArray(weeklyAvailability)) {
        for (const weekEntry of weeklyAvailability) {
          if (Array.isArray(weekEntry.slots)) {
            const slot = weekEntry.slots.find((s) => s.slotId === value.slotId);
            if (slot && slot.maxTokens && (slot.maxTokens - (slot.reservedTokens || 0)) > 0) {
              slotFound = true;
              // Store old slot for release
              const oldSlotId = appointment.slotId;
              // Auto-derive scheduledAt from slot
              appointment.slotId = value.slotId;
              appointment.scheduledAt = new Date(`${slot.date}T${slot.startTime}:00Z`);
              // Mark that we need to release old slot
              appointment._releaseOldSlot = oldSlotId;
              break;
            }
          }
        }
      }

      if (!slotFound) {
        throw new ApiError(StatusCodes.CONFLICT, 'Selected slot is not available');
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(StatusCodes.BAD_GATEWAY, `Failed to update slot: ${err.message}`);
    }
  }

  // Update only provided fields
  if (value.reason !== undefined) {
    appointment.reason = value.reason;
  }
  if (value.type !== undefined) {
    appointment.type = value.type;
  }
  if (value.status !== undefined) {
    appointment.status = value.status;
  }

  appointment.updatedBy = req.user.id;

  // Handle slot change: release old slot and reserve new slot
  if (appointment._releaseOldSlot) {
    const oldSlotId = appointment._releaseOldSlot;
    try {
      // Release old slot
      await releaseSlot({
        doctorId: appointment.doctorId,
        slotId: oldSlotId,
        authorization
      });
      console.log(`[UPDATE] Released old slot ${oldSlotId} for appointment ${appointment._id}`);
    } catch (error) {
      console.error('Warning: Failed to release old slot:', error.message);
    }

    try {
      // Reserve new slot
      await reserveSlot({
        doctorId: appointment.doctorId,
        slotId: appointment.slotId,
        authorization
      });
      console.log(`[UPDATE] Reserved new slot ${appointment.slotId} for appointment ${appointment._id}`);
    } catch (error) {
      // If new slot reservation fails, try to re-reserve old slot
      try {
        await reserveSlot({
          doctorId: appointment.doctorId,
          slotId: oldSlotId,
          authorization
        });
      } catch (rollbackError) {
        console.error('Critical: Failed to rollback slot reservation:', rollbackError.message);
      }
      throw new ApiError(StatusCodes.CONFLICT, `Failed to reserve new slot: ${error.message}`);
    }

    // Clean up internal flag
    delete appointment._releaseOldSlot;
  }

  await appointment.save();

  // Send notification if status changed
  if (value.status) {
    try {
      await sendAppointmentStatusNotification({
        email: undefined,
        appointmentId: appointment._id.toString(),
        status: appointment.status,
        authorization
      });
    } catch (error) {
      console.error('Failed to send status notification:', error);
    }
  }

  return res.status(StatusCodes.OK).json(appointment);
});


//Request appointment cancellation (Patient initiates)

const requestCancellation = asyncHandler(async (req, res) => {
  const { error, value } = requestCancellationSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  // Only patient can request cancellation
  if (req.user.role === 'patient' && req.user.id !== appointment.patientId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only the patient can request cancellation');
  }

  // Cannot cancel completed, already cancelled, or pending cancellation requests
  if (['completed', 'cancelled', 'cancellation_requested'].includes(appointment.status)) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      `Cannot cancel appointment with status "${appointment.status}"`
    );
  }

  // Update status to cancellation_requested
  appointment.status = 'cancellation_requested';
  appointment.cancellation = {
    requestedBy: req.user.id,
    requestedAt: new Date(),
    reason: value.reason
  };
  appointment.updatedBy = req.user.id;
  await appointment.save();

  // Send cancellation request notification to admin
  try {
    const authorization = req.headers.authorization;
    await sendCancellationRequestNotification({
      appointmentId: appointment._id.toString(),
      patientId: appointment.patientId,
      doctorName: appointment.doctorName,
      scheduledAt: appointment.scheduledAt,
      reason: value.reason,
      authorization
    });
  } catch (error) {
    console.error('Failed to notify admin of cancellation request:', error);
  }

  return res.status(StatusCodes.OK).json({
    message: 'Cancellation request submitted for admin approval',
    appointmentId: appointment._id,
    status: appointment.status
  });
});

 //Admin approve cancellation or offer reschedule
 //PUT /appointments/{id}/approve-cancellation
 
const approveCancellation = asyncHandler(async (req, res) => {
  // Admin only
  if (req.user.role !== 'admin') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only admins can approve cancellations');
  }

  const { error, value } = approveCancellationSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  if (appointment.status !== 'cancellation_requested') {
    throw new ApiError(
      StatusCodes.CONFLICT,
      `Can only approve pending cancellation requests. Current status: ${appointment.status}`
    );
  }

  const authorization = req.headers.authorization;

  if (value.approvalStatus === 'approve_cancellation') {
    // Full cancellation - NO REFUND per requirements
    appointment.status = 'cancelled';
    appointment.cancellation.approvedAt = new Date();
    appointment.cancellation.approvedBy = req.user.id;
    appointment.cancellation.adminNotes = value.adminNotes || '';
    appointment.updatedBy = req.user.id;

    // Release slot in doctor-service
    try {
      if (appointment.slotId) {
        await releaseSlot({
          doctorId: appointment.doctorId,
          slotId: appointment.slotId,
          authorization
        });
      }
    } catch (error) {
      console.error('Failed to release slot on cancellation:', error);
      // Don't fail cancellation if slot release fails - appointment is already cancelled
    }

    await appointment.save();

    // Notify patient of cancellation (no refund)
    try {
      if (authorization) {
        await sendAppointmentStatusNotification({
          appointmentId: appointment._id.toString(),
          status: 'cancelled',
          message: 'Your appointment has been cancelled. No refund will be issued. Please contact admin for rescheduling options.',
          authorization
        });
      }
    } catch (error) {
      console.error('Failed to notify patient of cancellation:', error);
    }
  } else if (value.approvalStatus === 'offer_reschedule') {
    // Offer alternative slot - auto-derive date from slot
    const alternativeDoctorId = value.alternativeDoctorId || appointment.doctorId;

    // Fetch the alternative slot and auto-derive its date
    let alternativeDate;
    try {
      const doctorSchedule = await getDoctorSchedule({
        doctorId: alternativeDoctorId,
        authorization
      });

      // Find the slot in weekly availability
      let slotFound = false;
      const weeklyAvailability = doctorSchedule.weeklyAvailability || [];
      
      if (Array.isArray(weeklyAvailability)) {
        for (const weekEntry of weeklyAvailability) {
          if (Array.isArray(weekEntry.slots)) {
            const slot = weekEntry.slots.find((s) => s.slotId === value.alternativeSlotId);
            if (slot) {
              slotFound = true;
              // Auto-derive alternativeDate from slot
              alternativeDate = new Date(`${slot.date}T${slot.startTime}:00Z`);
              break;
            }
          }
        }
      }

      if (!slotFound) {
        throw new ApiError(StatusCodes.CONFLICT, 'Alternative slot not found');
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(StatusCodes.BAD_GATEWAY, `Failed to fetch alternative slot: ${err.message}`);
    }

    // Offer alternative slot
    appointment.status = 'rescheduled';
    appointment.cancellation.approvedAt = new Date();
    appointment.cancellation.approvedBy = req.user.id;
    appointment.cancellation.adminNotes = value.adminNotes || '';
    appointment.cancellation.alternativeSlotId = value.alternativeSlotId;
    appointment.cancellation.alternativeDate = alternativeDate;
    appointment.cancellation.alternativeDoctorId = alternativeDoctorId;
    appointment.updatedBy = req.user.id;

    await appointment.save();

    // Notify patient of reschedule offer
    try {
      if (authorization) {
        await sendAppointmentStatusNotification({
          appointmentId: appointment._id.toString(),
          status: 'rescheduled',
          message: `Your cancellation request has been approved. An alternative appointment is offered. Please confirm or contact admin for more options.`,
          authorization
        });
      }
    } catch (error) {
      console.error('Failed to notify patient of reschedule offer:', error);
    }
  }

  return res.status(StatusCodes.OK).json({
    message: 'Cancellation request processed',
    appointment: appointment.toObject()
  });
});

 //Admin offer reschedule (standalone endpoint)
 //POST /appointments/{id}/offer-reschedule

const offerReschedule = asyncHandler(async (req, res) => {
  // Admin only
  if (req.user.role !== 'admin') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only admins can offer reschedules');
  }

  const { error, value } = offerRescheduleSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.details.map((d) => d.message).join(', '));
  }

  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  // Can offer reschedule for pending, cancellation_requested, OR cancelled appointments
  if (!['pending', 'cancellation_requested', 'cancelled'].includes(appointment.status)) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      `Can only offer reschedules for pending, cancellation_requested, or cancelled appointments. Current status: ${appointment.status}`
    );
  }

  const authorization = req.headers.authorization;
  const alternativeDoctorId = value.alternativeDoctorId || appointment.doctorId;

  // Fetch the alternative slot and auto-derive its date
  let alternativeDate;
  try {
    const doctorSchedule = await getDoctorSchedule({
      doctorId: alternativeDoctorId,
      authorization
    });

    // Find the slot in weekly availability
    let slotFound = false;
    const weeklyAvailability = doctorSchedule.weeklyAvailability || [];
    
    if (Array.isArray(weeklyAvailability)) {
      for (const weekEntry of weeklyAvailability) {
        if (Array.isArray(weekEntry.slots)) {
          const slot = weekEntry.slots.find((s) => s.slotId === value.alternativeSlotId);
          if (slot) {
            slotFound = true;
            // Auto-derive alternativeDate from slot
            alternativeDate = new Date(`${slot.date}T${slot.startTime}:00Z`);
            break;
          }
        }
      }
    }

    if (!slotFound) {
      throw new ApiError(StatusCodes.CONFLICT, 'Alternative slot not found');
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(StatusCodes.BAD_GATEWAY, `Failed to fetch alternative slot: ${err.message}`);
  }

  // Update appointment with alternative slot info
  appointment.status = 'rescheduled';
  if (appointment.status === 'cancellation_requested') {
    appointment.cancellation.approvedAt = new Date();
    appointment.cancellation.approvedBy = req.user.id;
    appointment.cancellation.adminNotes = value.adminNotes || '';
  }
  appointment.cancellation.alternativeSlotId = value.alternativeSlotId;
  appointment.cancellation.alternativeDate = alternativeDate;
  appointment.cancellation.alternativeDoctorId = alternativeDoctorId;
  appointment.updatedBy = req.user.id;

  await appointment.save();

  // Notify patient of reschedule offer
  try {
    if (authorization) {
      await sendAppointmentStatusNotification({
        appointmentId: appointment._id.toString(),
        status: 'rescheduled',
        message: `An alternative appointment slot has been offered. Please confirm or contact admin for more options.`,
        authorization
      });
    }
  } catch (error) {
    console.error('Failed to notify patient of reschedule offer:', error);
  }

  return res.status(StatusCodes.OK).json({
    message: 'Reschedule offer sent to patient',
    appointment: appointment.toObject()
  });
});


 //Patient confirm rescheduled appointment
 //PUT /appointments/{id}/confirm-reschedule
 
const confirmReschedule = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  // Only patient or admin can confirm
  if (req.user.role === 'patient' && req.user.id !== appointment.patientId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only the patient can confirm reschedule');
  }

  if (appointment.status !== 'rescheduled') {
    throw new ApiError(
      StatusCodes.CONFLICT,
      `Can only confirm pending reschedule offers. Current status: ${appointment.status}`
    );
  }

  if (!appointment.cancellation?.alternativeSlotId || !appointment.cancellation?.alternativeDate) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No alternative slot information available');
  }

  const authorization = req.headers.authorization;
  if (!authorization) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Authorization header required');
  }

  // Reserve new slot in doctor-service
  try {
    await reserveSlot({
      doctorId: appointment.cancellation.alternativeDoctorId || appointment.doctorId,
      slotId: appointment.cancellation.alternativeSlotId,
      authorization
    });
  } catch (error) {
    throw new ApiError(StatusCodes.CONFLICT, `Failed to reserve new slot: ${error.message}`);
  }

  // Update appointment with new slot information
  appointment.slotId = appointment.cancellation.alternativeSlotId;
  appointment.scheduledAt = appointment.cancellation.alternativeDate;
  appointment.doctorId = appointment.cancellation.alternativeDoctorId || appointment.doctorId;
  appointment.status = 'pending'; // Back to pending status after reschedule
  appointment.updatedBy = req.user.id;

  await appointment.save();

  // Notify patient of successful reschedule confirmation
  try {
    if (authorization) {
      await sendAppointmentStatusNotification({
        appointmentId: appointment._id.toString(),
        status: 'pending',
        message: 'Your rescheduled appointment has been confirmed',
        authorization
      });
    }
  } catch (error) {
    console.error('Failed to notify patient of reschedule confirmation:', error);
  }

  return res.status(StatusCodes.OK).json({
    message: 'Appointment rescheduled successfully',
    appointment: appointment.toObject()
  });
});

// Payment webhook receiver - called by common/payment service when payment completes
const handlePaymentWebhook = asyncHandler(async (req, res) => {
  const { appointmentId, paymentId, status, transactionId } = req.body || {};

  console.log('[WEBHOOK] Received payment webhook:', JSON.stringify(req.body));

  if (!appointmentId) {
    console.warn('[WEBHOOK] Missing appointmentId in payload');
    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'appointmentId is required' });
  }

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    console.warn(`[WEBHOOK] Appointment not found for id=${appointmentId}`);
    return res.status(StatusCodes.NOT_FOUND).json({ message: 'Appointment not found' });
  }

  // Normalize success markers from payment service
  const successStates = ['succeeded', 'success', 'paid'];
  if (successStates.includes((status || '').toLowerCase())) {
    console.log(`[WEBHOOK] Marking appointment ${appointmentId} paid (tx=${transactionId||paymentId})`);
    appointment.paymentStatus = 'paid';
    if (appointment.status !== 'confirmed') appointment.status = 'confirmed';
    appointment.updatedBy = 'system:payment-webhook';
    await appointment.save();

    // Notify patient/admin about confirmation (best-effort)
    try {
      await sendAppointmentStatusNotification({
        appointmentId: appointment._id.toString(),
        status: 'confirmed',
        message: `Payment received (tx: ${transactionId || paymentId}). Appointment confirmed.`,
        authorization: req.headers.authorization
      });
    } catch (notifyErr) {
      console.error('Failed to send payment confirmation notification:', notifyErr.message);
    }

    return res.status(StatusCodes.OK).json({ message: 'Appointment payment marked as paid and confirmed' });
  }

  // For non-success states, update paymentStatus conservatively if provided
  if (status) {
    // Map unknown values to 'pending' if not in enum
    const mapped = status.toLowerCase() === 'refunded' ? 'refunded' : 'pending';
    appointment.paymentStatus = mapped;
    appointment.updatedBy = 'system:payment-webhook';
    await appointment.save();
  }

  return res.status(StatusCodes.OK).json({ message: 'Payment webhook processed' });
});

module.exports = {
  searchDoctors,
  bookAppointment,
  listAppointments,
  getAppointmentById,
  getAppointmentStatus,
  updateAppointment,
  requestCancellation,
  approveCancellation,
  offerReschedule,
  confirmReschedule,
  handlePaymentWebhook
};