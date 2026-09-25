const {
  VEHICLE_TYPES,
  FUEL_TYPES,
  TRANSMISSION_TYPES,
  VEHICLE_LIMITS,
} = require('./vehicle.constants');

// Standard registration number pattern (accepts alphanumeric plates 4-15 characters)
const REGISTRATION_REGEX = /^[A-Z0-9]{4,15}$/;

// Standard Vehicle Identification Number (VIN) regex: 11-17 alphanumeric characters
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{11,17}$/i;

// Forbidden fields that cannot be altered via request body
const FORBIDDEN_FIELDS = ['userId', 'status', 'createdAt', 'updatedAt', '_id', 'id'];

/**
 * Normalizes registration number by stripping whitespace and dashes
 * @param {string} reg
 * @returns {string}
 */
const sanitizeRegistrationNumber = (reg) => {
  if (typeof reg !== 'string') return '';
  return reg.replace(/[\s-]/g, '').toUpperCase();
};

/**
 * Middleware: Validate POST /api/vehicles payload
 */
const validateAddVehicle = (req, res, next) => {
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

  // 2. vehicleType
  if (!body.vehicleType || typeof body.vehicleType !== 'string') {
    errors.vehicleType = 'Vehicle type is required.';
  } else {
    const normalizedType = body.vehicleType.toUpperCase().trim();
    if (!Object.values(VEHICLE_TYPES).includes(normalizedType)) {
      errors.vehicleType = `Invalid vehicle type. Allowed values: ${Object.values(VEHICLE_TYPES).join(', ')}.`;
    } else {
      req.body.vehicleType = normalizedType;
    }
  }

  // 3. make
  if (!body.make || typeof body.make !== 'string' || !body.make.trim()) {
    errors.make = 'Make is required.';
  } else {
    const trimmed = body.make.trim();
    if (trimmed.length < VEHICLE_LIMITS.MAKE_MIN_LENGTH || trimmed.length > VEHICLE_LIMITS.MAKE_MAX_LENGTH) {
      errors.make = `Make must be between ${VEHICLE_LIMITS.MAKE_MIN_LENGTH} and ${VEHICLE_LIMITS.MAKE_MAX_LENGTH} characters.`;
    }
  }

  // 4. model
  if (!body.model || typeof body.model !== 'string' || !body.model.trim()) {
    errors.model = 'Model is required.';
  } else {
    const trimmed = body.model.trim();
    if (trimmed.length < VEHICLE_LIMITS.MODEL_MIN_LENGTH || trimmed.length > VEHICLE_LIMITS.MODEL_MAX_LENGTH) {
      errors.model = `Model must be between ${VEHICLE_LIMITS.MODEL_MIN_LENGTH} and ${VEHICLE_LIMITS.MODEL_MAX_LENGTH} characters.`;
    }
  }

  // 5. variant
  if (body.variant !== undefined && body.variant !== null) {
    if (typeof body.variant !== 'string') {
      errors.variant = 'Variant must be a string.';
    } else if (body.variant.trim().length > VEHICLE_LIMITS.VARIANT_MAX_LENGTH) {
      errors.variant = `Variant cannot exceed ${VEHICLE_LIMITS.VARIANT_MAX_LENGTH} characters.`;
    }
  }

  // 6. registrationNumber
  if (!body.registrationNumber || typeof body.registrationNumber !== 'string') {
    errors.registrationNumber = 'Registration number is required.';
  } else {
    const sanitized = sanitizeRegistrationNumber(body.registrationNumber);
    if (!REGISTRATION_REGEX.test(sanitized)) {
      errors.registrationNumber = 'Invalid registration number format. Must contain 4 to 15 alphanumeric characters.';
    } else {
      req.body.registrationNumber = sanitized;
    }
  }

  // 7. registrationYear
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear + VEHICLE_LIMITS.MAX_REGISTRATION_YEAR_OFFSET;
  const regYear = Number(body.registrationYear);
  if (!body.registrationYear || isNaN(regYear) || !Number.isInteger(regYear)) {
    errors.registrationYear = 'Registration year must be a valid integer year.';
  } else if (regYear < VEHICLE_LIMITS.MIN_REGISTRATION_YEAR || regYear > maxYear) {
    errors.registrationYear = `Registration year must be between ${VEHICLE_LIMITS.MIN_REGISTRATION_YEAR} and ${maxYear}.`;
  }

  // 8. fuelType
  if (!body.fuelType || typeof body.fuelType !== 'string') {
    errors.fuelType = 'Fuel type is required.';
  } else {
    const normalizedFuel = body.fuelType.toUpperCase().trim();
    if (!Object.values(FUEL_TYPES).includes(normalizedFuel)) {
      errors.fuelType = `Invalid fuel type. Allowed values: ${Object.values(FUEL_TYPES).join(', ')}.`;
    } else {
      req.body.fuelType = normalizedFuel;
    }
  }

  // 9. transmission
  if (body.transmission !== undefined && body.transmission !== null && body.transmission !== '') {
    if (typeof body.transmission !== 'string') {
      errors.transmission = 'Transmission must be a string.';
    } else {
      const normalizedTrans = body.transmission.toUpperCase().trim();
      if (!Object.values(TRANSMISSION_TYPES).includes(normalizedTrans)) {
        errors.transmission = `Invalid transmission. Allowed values: ${Object.values(TRANSMISSION_TYPES).join(', ')}.`;
      } else {
        req.body.transmission = normalizedTrans;
      }
    }
  }

  // 10. color
  if (body.color !== undefined && body.color !== null) {
    if (typeof body.color !== 'string') {
      errors.color = 'Color must be a string.';
    } else if (body.color.trim().length > VEHICLE_LIMITS.COLOR_MAX_LENGTH) {
      errors.color = `Color cannot exceed ${VEHICLE_LIMITS.COLOR_MAX_LENGTH} characters.`;
    }
  }

  // 11. vinNumber
  if (body.vinNumber !== undefined && body.vinNumber !== null && body.vinNumber !== '') {
    if (typeof body.vinNumber !== 'string') {
      errors.vinNumber = 'VIN number must be a string.';
    } else {
      const trimmedVin = body.vinNumber.trim().toUpperCase();
      if (!VIN_REGEX.test(trimmedVin)) {
        errors.vinNumber = 'Invalid VIN format. Must be 11 to 17 alphanumeric characters (excluding I, O, Q).';
      } else {
        req.body.vinNumber = trimmedVin;
      }
    }
  }

  // 12. odometerReading
  if (body.odometerReading !== undefined && body.odometerReading !== null && body.odometerReading !== '') {
    const odo = Number(body.odometerReading);
    if (isNaN(odo) || odo < VEHICLE_LIMITS.MIN_ODOMETER || odo > VEHICLE_LIMITS.MAX_ODOMETER) {
      errors.odometerReading = `Odometer reading must be a positive number up to ${VEHICLE_LIMITS.MAX_ODOMETER}.`;
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
 * Middleware: Validate PUT /api/vehicles/:vehicleId payload
 */
const validateUpdateVehicle = (req, res, next) => {
  const errors = {};
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: Request body must contain at least one field to update.',
      error: { fields: { body: 'Empty update payload' } },
    });
  }

  // 1. Detect forbidden fields
  for (const field of FORBIDDEN_FIELDS) {
    if (field in body) {
      errors[field] = `Modifying '${field}' is strictly prohibited.`;
    }
  }

  // 2. vehicleType
  if (body.vehicleType !== undefined) {
    if (typeof body.vehicleType !== 'string') {
      errors.vehicleType = 'Vehicle type must be a string.';
    } else {
      const normalizedType = body.vehicleType.toUpperCase().trim();
      if (!Object.values(VEHICLE_TYPES).includes(normalizedType)) {
        errors.vehicleType = `Invalid vehicle type. Allowed values: ${Object.values(VEHICLE_TYPES).join(', ')}.`;
      } else {
        req.body.vehicleType = normalizedType;
      }
    }
  }

  // 3. make
  if (body.make !== undefined) {
    if (typeof body.make !== 'string' || !body.make.trim()) {
      errors.make = 'Make cannot be empty.';
    } else {
      const trimmed = body.make.trim();
      if (trimmed.length < VEHICLE_LIMITS.MAKE_MIN_LENGTH || trimmed.length > VEHICLE_LIMITS.MAKE_MAX_LENGTH) {
        errors.make = `Make must be between ${VEHICLE_LIMITS.MAKE_MIN_LENGTH} and ${VEHICLE_LIMITS.MAKE_MAX_LENGTH} characters.`;
      }
    }
  }

  // 4. model
  if (body.model !== undefined) {
    if (typeof body.model !== 'string' || !body.model.trim()) {
      errors.model = 'Model cannot be empty.';
    } else {
      const trimmed = body.model.trim();
      if (trimmed.length < VEHICLE_LIMITS.MODEL_MIN_LENGTH || trimmed.length > VEHICLE_LIMITS.MODEL_MAX_LENGTH) {
        errors.model = `Model must be between ${VEHICLE_LIMITS.MODEL_MIN_LENGTH} and ${VEHICLE_LIMITS.MODEL_MAX_LENGTH} characters.`;
      }
    }
  }

  // 5. variant
  if (body.variant !== undefined && body.variant !== null) {
    if (typeof body.variant !== 'string') {
      errors.variant = 'Variant must be a string.';
    } else if (body.variant.trim().length > VEHICLE_LIMITS.VARIANT_MAX_LENGTH) {
      errors.variant = `Variant cannot exceed ${VEHICLE_LIMITS.VARIANT_MAX_LENGTH} characters.`;
    }
  }

  // 6. registrationNumber
  if (body.registrationNumber !== undefined) {
    if (typeof body.registrationNumber !== 'string') {
      errors.registrationNumber = 'Registration number must be a string.';
    } else {
      const sanitized = sanitizeRegistrationNumber(body.registrationNumber);
      if (!REGISTRATION_REGEX.test(sanitized)) {
        errors.registrationNumber = 'Invalid registration number format. Must contain 4 to 15 alphanumeric characters.';
      } else {
        req.body.registrationNumber = sanitized;
      }
    }
  }

  // 7. registrationYear
  if (body.registrationYear !== undefined) {
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + VEHICLE_LIMITS.MAX_REGISTRATION_YEAR_OFFSET;
    const regYear = Number(body.registrationYear);
    if (isNaN(regYear) || !Number.isInteger(regYear)) {
      errors.registrationYear = 'Registration year must be an integer year.';
    } else if (regYear < VEHICLE_LIMITS.MIN_REGISTRATION_YEAR || regYear > maxYear) {
      errors.registrationYear = `Registration year must be between ${VEHICLE_LIMITS.MIN_REGISTRATION_YEAR} and ${maxYear}.`;
    }
  }

  // 8. fuelType
  if (body.fuelType !== undefined) {
    if (typeof body.fuelType !== 'string') {
      errors.fuelType = 'Fuel type must be a string.';
    } else {
      const normalizedFuel = body.fuelType.toUpperCase().trim();
      if (!Object.values(FUEL_TYPES).includes(normalizedFuel)) {
        errors.fuelType = `Invalid fuel type. Allowed values: ${Object.values(FUEL_TYPES).join(', ')}.`;
      } else {
        req.body.fuelType = normalizedFuel;
      }
    }
  }

  // 9. transmission
  if (body.transmission !== undefined && body.transmission !== null && body.transmission !== '') {
    if (typeof body.transmission !== 'string') {
      errors.transmission = 'Transmission must be a string.';
    } else {
      const normalizedTrans = body.transmission.toUpperCase().trim();
      if (!Object.values(TRANSMISSION_TYPES).includes(normalizedTrans)) {
        errors.transmission = `Invalid transmission. Allowed values: ${Object.values(TRANSMISSION_TYPES).join(', ')}.`;
      } else {
        req.body.transmission = normalizedTrans;
      }
    }
  }

  // 10. color
  if (body.color !== undefined && body.color !== null) {
    if (typeof body.color !== 'string') {
      errors.color = 'Color must be a string.';
    } else if (body.color.trim().length > VEHICLE_LIMITS.COLOR_MAX_LENGTH) {
      errors.color = `Color cannot exceed ${VEHICLE_LIMITS.COLOR_MAX_LENGTH} characters.`;
    }
  }

  // 11. vinNumber
  if (body.vinNumber !== undefined && body.vinNumber !== null && body.vinNumber !== '') {
    if (typeof body.vinNumber !== 'string') {
      errors.vinNumber = 'VIN number must be a string.';
    } else {
      const trimmedVin = body.vinNumber.trim().toUpperCase();
      if (!VIN_REGEX.test(trimmedVin)) {
        errors.vinNumber = 'Invalid VIN format. Must be 11 to 17 alphanumeric characters (excluding I, O, Q).';
      } else {
        req.body.vinNumber = trimmedVin;
      }
    }
  }

  // 12. odometerReading
  if (body.odometerReading !== undefined && body.odometerReading !== null && body.odometerReading !== '') {
    const odo = Number(body.odometerReading);
    if (isNaN(odo) || odo < VEHICLE_LIMITS.MIN_ODOMETER || odo > VEHICLE_LIMITS.MAX_ODOMETER) {
      errors.odometerReading = `Odometer reading must be a positive number up to ${VEHICLE_LIMITS.MAX_ODOMETER}.`;
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

module.exports = {
  sanitizeRegistrationNumber,
  validateAddVehicle,
  validateUpdateVehicle,
};
