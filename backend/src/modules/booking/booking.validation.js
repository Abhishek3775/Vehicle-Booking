const mongoose = require('mongoose');
const { BOOKING_TYPES, BOOKING_LIMITS } = require('./booking.constants');

// Forbidden fields that cannot be directly passed via client payload
const FORBIDDEN_FIELDS = [
  'userId',
  'bookingReference',
  'status',
  'cancellationReason',
  'cancelledBy',
  'cancelledAt',
  '_id',
  'id',
  'createdAt',
  'updatedAt',
  'addressSnapshot',
  'vehicleSnapshot',
  'serviceSnapshot',
  'packageSnapshot',
  'locationSnapshot',
];

/**
 * Middleware: Validate POST /api/bookings payload
 */
const validateCreateBooking = (req, res, next) => {
  const errors = {};
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: Request body must be a valid JSON object.',
      error: { fields: { body: 'Invalid JSON body' } },
    });
  }

  // 1. Detect forbidden fields
  for (const field of FORBIDDEN_FIELDS) {
    if (field in body) {
      errors[field] = `Providing '${field}' in request body is strictly prohibited.`;
    }
  }

  // 2. vehicleId
  if (!body.vehicleId || typeof body.vehicleId !== 'string' || !body.vehicleId.trim()) {
    errors.vehicleId = 'Vehicle ID is required.';
  } else if (!mongoose.Types.ObjectId.isValid(body.vehicleId.trim())) {
    errors.vehicleId = 'Vehicle ID must be a valid MongoDB ObjectId.';
  } else {
    req.body.vehicleId = body.vehicleId.trim();
  }

  // 3. Exactly one of serviceId or servicePackageId
  const hasService = body.serviceId && typeof body.serviceId === 'string' && body.serviceId.trim();
  const hasPackage =
    body.servicePackageId &&
    typeof body.servicePackageId === 'string' &&
    body.servicePackageId.trim();

  if (!hasService && !hasPackage) {
    errors.service = 'Either serviceId or servicePackageId must be provided.';
  } else if (hasService && hasPackage) {
    errors.service =
      'Cannot provide both serviceId and servicePackageId in the same booking. Please choose either an individual service or a service package.';
  } else if (hasService) {
    if (!mongoose.Types.ObjectId.isValid(body.serviceId.trim())) {
      errors.serviceId = 'Service ID must be a valid MongoDB ObjectId.';
    } else {
      req.body.serviceId = body.serviceId.trim();
      req.body.servicePackageId = null;
    }
  } else if (hasPackage) {
    if (!mongoose.Types.ObjectId.isValid(body.servicePackageId.trim())) {
      errors.servicePackageId = 'Service package ID must be a valid MongoDB ObjectId.';
    } else {
      req.body.servicePackageId = body.servicePackageId.trim();
      req.body.serviceId = null;
    }
  }

  // 4. bookingType
  let normalizedBookingType = BOOKING_TYPES.SCHEDULED;
  if (body.bookingType !== undefined && body.bookingType !== null) {
    if (typeof body.bookingType !== 'string') {
      errors.bookingType = 'Booking type must be a string.';
    } else {
      const type = body.bookingType.toUpperCase().trim();
      if (!Object.values(BOOKING_TYPES).includes(type)) {
        errors.bookingType = `Invalid booking type. Allowed values: ${Object.values(
          BOOKING_TYPES
        ).join(', ')}.`;
      } else {
        normalizedBookingType = type;
        req.body.bookingType = type;
      }
    }
  } else {
    req.body.bookingType = BOOKING_TYPES.SCHEDULED;
  }

  // 5. scheduledAt & addressId requirements based on bookingType
  if (normalizedBookingType === BOOKING_TYPES.SCHEDULED) {
    // scheduledAt is mandatory for scheduled bookings
    if (!body.scheduledAt) {
      errors.scheduledAt = 'Scheduled date and time (scheduledAt) is required for scheduled bookings.';
    } else {
      const scheduledDate = new Date(body.scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        errors.scheduledAt = 'Scheduled date and time must be a valid ISO Date.';
      } else if (scheduledDate.getTime() <= Date.now()) {
        errors.scheduledAt = 'Scheduled date and time must be in the future.';
      } else {
        req.body.scheduledAt = scheduledDate;
      }
    }

    // addressId is required for scheduled bookings
    if (!body.addressId || typeof body.addressId !== 'string' || !body.addressId.trim()) {
      errors.addressId = 'Address ID (addressId) is required for scheduled bookings.';
    } else if (!mongoose.Types.ObjectId.isValid(body.addressId.trim())) {
      errors.addressId = 'Address ID must be a valid MongoDB ObjectId.';
    } else {
      req.body.addressId = body.addressId.trim();
    }
  } else if (normalizedBookingType === BOOKING_TYPES.EMERGENCY) {
    // Optional scheduledAt for emergency bookings
    if (body.scheduledAt !== undefined && body.scheduledAt !== null) {
      const scheduledDate = new Date(body.scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        errors.scheduledAt = 'Scheduled date and time must be a valid ISO Date.';
      } else {
        req.body.scheduledAt = scheduledDate;
      }
    } else {
      req.body.scheduledAt = null;
    }

    // Emergency bookings require location or addressId
    const hasAddress = body.addressId && typeof body.addressId === 'string' && body.addressId.trim();
    const hasLocation =
      body.location &&
      typeof body.location === 'object' &&
      body.location.latitude !== undefined &&
      body.location.longitude !== undefined;

    if (!hasAddress && !hasLocation) {
      errors.location =
        'Emergency bookings require either a saved addressId or current location coordinates (latitude and longitude).';
    }

    if (hasAddress) {
      if (!mongoose.Types.ObjectId.isValid(body.addressId.trim())) {
        errors.addressId = 'Address ID must be a valid MongoDB ObjectId.';
      } else {
        req.body.addressId = body.addressId.trim();
      }
    }
  }

  // 6. location coordinates validation if provided
  if (body.location && typeof body.location === 'object') {
    const { latitude, longitude, addressText } = body.location;

    if (latitude !== undefined && latitude !== null) {
      const lat = Number(latitude);
      if (isNaN(lat) || lat < BOOKING_LIMITS.MIN_LATITUDE || lat > BOOKING_LIMITS.MAX_LATITUDE) {
        errors['location.latitude'] = `Latitude must be a valid number between ${BOOKING_LIMITS.MIN_LATITUDE} and ${BOOKING_LIMITS.MAX_LATITUDE}.`;
      }
    }

    if (longitude !== undefined && longitude !== null) {
      const lng = Number(longitude);
      if (isNaN(lng) || lng < BOOKING_LIMITS.MIN_LONGITUDE || lng > BOOKING_LIMITS.MAX_LONGITUDE) {
        errors['location.longitude'] = `Longitude must be a valid number between ${BOOKING_LIMITS.MIN_LONGITUDE} and ${BOOKING_LIMITS.MAX_LONGITUDE}.`;
      }
    }

    if (addressText !== undefined && addressText !== null && typeof addressText !== 'string') {
      errors['location.addressText'] = 'Location addressText must be a string.';
    }
  }

  // 7. customerNotes
  if (body.customerNotes !== undefined && body.customerNotes !== null) {
    if (typeof body.customerNotes !== 'string') {
      errors.customerNotes = 'Customer notes must be a string.';
    } else if (body.customerNotes.trim().length > BOOKING_LIMITS.NOTES_MAX_LENGTH) {
      errors.customerNotes = `Customer notes cannot exceed ${BOOKING_LIMITS.NOTES_MAX_LENGTH} characters.`;
    } else {
      req.body.customerNotes = body.customerNotes.trim();
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: { fields: errors },
    });
  }

  next();
};

/**
 * Middleware: Validate PATCH /api/bookings/:bookingId/cancel payload
 */
const validateCancelBooking = (req, res, next) => {
  const { cancellationReason } = req.body || {};

  if (!cancellationReason || typeof cancellationReason !== 'string' || !cancellationReason.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: { fields: { cancellationReason: 'Cancellation reason is required.' } },
    });
  }

  const trimmed = cancellationReason.trim();
  if (trimmed.length < BOOKING_LIMITS.REASON_MIN_LENGTH || trimmed.length > BOOKING_LIMITS.REASON_MAX_LENGTH) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        fields: {
          cancellationReason: `Cancellation reason must be between ${BOOKING_LIMITS.REASON_MIN_LENGTH} and ${BOOKING_LIMITS.REASON_MAX_LENGTH} characters.`,
        },
      },
    });
  }

  req.body.cancellationReason = trimmed;
  next();
};

module.exports = {
  validateCreateBooking,
  validateCancelBooking,
};
