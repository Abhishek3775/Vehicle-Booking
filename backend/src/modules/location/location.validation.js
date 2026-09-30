const mongoose = require('mongoose');
const {
  LOCATION_SOURCES,
  LOCATION_LIMITS,
  PAGINATION_LIMITS,
} = require('./location.constants');

const FORBIDDEN_FIELDS = [
  'userId',
  'mechanicId',
  '_id',
  'id',
  'isCurrent',
  'locationType',
  'createdAt',
  'updatedAt',
  'expiresAt',
];

/**
 * Validate numeric coordinate value within min/max boundaries
 * @param {*} value
 * @param {number} min
 * @param {number} max
 * @returns {{ valid: boolean, num: number, error?: string }}
 */
const validateCoordinate = (value, min, max, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return { valid: false, error: `${fieldName} is required.` };
  }
  const num = Number(value);
  if (typeof value === 'boolean' || isNaN(num) || !isFinite(num)) {
    return { valid: false, error: `${fieldName} must be a valid finite number.` };
  }
  if (num < min || num > max) {
    return { valid: false, error: `${fieldName} must be between ${min} and ${max}.` };
  }
  return { valid: true, num };
};

/**
 * Middleware: Validate POST /api/locations/current payload
 */
const validateCustomerCurrentLocation = (req, res, next) => {
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

  // 2. Latitude & Longitude validation
  const latRes = validateCoordinate(body.latitude, LOCATION_LIMITS.MIN_LATITUDE, LOCATION_LIMITS.MAX_LATITUDE, 'latitude');
  if (!latRes.valid) {
    errors.latitude = latRes.error;
  } else {
    req.body.latitude = latRes.num;
  }

  const lonRes = validateCoordinate(body.longitude, LOCATION_LIMITS.MIN_LONGITUDE, LOCATION_LIMITS.MAX_LONGITUDE, 'longitude');
  if (!lonRes.valid) {
    errors.longitude = lonRes.error;
  } else {
    req.body.longitude = lonRes.num;
  }

  // 3. Optional Accuracy
  if (body.accuracy !== undefined && body.accuracy !== null && body.accuracy !== '') {
    const acc = Number(body.accuracy);
    if (isNaN(acc) || !isFinite(acc) || acc < LOCATION_LIMITS.MIN_ACCURACY) {
      errors.accuracy = `Accuracy must be a non-negative number.`;
    } else {
      req.body.accuracy = acc;
    }
  }

  // 4. Optional Altitude
  if (body.altitude !== undefined && body.altitude !== null && body.altitude !== '') {
    const alt = Number(body.altitude);
    if (isNaN(alt) || !isFinite(alt)) {
      errors.altitude = `Altitude must be a valid number.`;
    } else {
      req.body.altitude = alt;
    }
  }

  // 5. Optional Heading
  if (body.heading !== undefined && body.heading !== null && body.heading !== '') {
    const heading = Number(body.heading);
    if (isNaN(heading) || !isFinite(heading) || heading < LOCATION_LIMITS.MIN_HEADING || heading > LOCATION_LIMITS.MAX_HEADING) {
      errors.heading = `Heading must be between ${LOCATION_LIMITS.MIN_HEADING} and ${LOCATION_LIMITS.MAX_HEADING} degrees.`;
    } else {
      req.body.heading = heading;
    }
  }

  // 6. Optional Speed
  if (body.speed !== undefined && body.speed !== null && body.speed !== '') {
    const speed = Number(body.speed);
    if (isNaN(speed) || !isFinite(speed) || speed < LOCATION_LIMITS.MIN_SPEED) {
      errors.speed = `Speed must be a non-negative number.`;
    } else {
      req.body.speed = speed;
    }
  }

  // 7. Optional Source
  if (body.source !== undefined && body.source !== null) {
    if (typeof body.source !== 'string' || !Object.values(LOCATION_SOURCES).includes(body.source.toUpperCase())) {
      errors.source = `Invalid source. Allowed values: ${Object.values(LOCATION_SOURCES).join(', ')}.`;
    } else {
      req.body.source = body.source.toUpperCase();
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
 * Middleware: Validate POST /api/locations/mechanic/current payload
 */
const validateMechanicCurrentLocation = (req, res, next) => {
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

  // 2. Latitude & Longitude validation
  const latRes = validateCoordinate(body.latitude, LOCATION_LIMITS.MIN_LATITUDE, LOCATION_LIMITS.MAX_LATITUDE, 'latitude');
  if (!latRes.valid) {
    errors.latitude = latRes.error;
  } else {
    req.body.latitude = latRes.num;
  }

  const lonRes = validateCoordinate(body.longitude, LOCATION_LIMITS.MIN_LONGITUDE, LOCATION_LIMITS.MAX_LONGITUDE, 'longitude');
  if (!lonRes.valid) {
    errors.longitude = lonRes.error;
  } else {
    req.body.longitude = lonRes.num;
  }

  // 3. Optional Accuracy
  if (body.accuracy !== undefined && body.accuracy !== null && body.accuracy !== '') {
    const acc = Number(body.accuracy);
    if (isNaN(acc) || !isFinite(acc) || acc < LOCATION_LIMITS.MIN_ACCURACY) {
      errors.accuracy = `Accuracy must be a non-negative number.`;
    } else {
      req.body.accuracy = acc;
    }
  }

  // 4. Optional Heading
  if (body.heading !== undefined && body.heading !== null && body.heading !== '') {
    const heading = Number(body.heading);
    if (isNaN(heading) || !isFinite(heading) || heading < LOCATION_LIMITS.MIN_HEADING || heading > LOCATION_LIMITS.MAX_HEADING) {
      errors.heading = `Heading must be between ${LOCATION_LIMITS.MIN_HEADING} and ${LOCATION_LIMITS.MAX_HEADING} degrees.`;
    } else {
      req.body.heading = heading;
    }
  }

  // 5. Optional Speed
  if (body.speed !== undefined && body.speed !== null && body.speed !== '') {
    const speed = Number(body.speed);
    if (isNaN(speed) || !isFinite(speed) || speed < LOCATION_LIMITS.MIN_SPEED) {
      errors.speed = `Speed must be a non-negative number.`;
    } else {
      req.body.speed = speed;
    }
  }

  // 6. Optional Source
  if (body.source !== undefined && body.source !== null) {
    if (typeof body.source !== 'string' || !Object.values(LOCATION_SOURCES).includes(body.source.toUpperCase())) {
      errors.source = `Invalid source. Allowed values: ${Object.values(LOCATION_SOURCES).join(', ')}.`;
    } else {
      req.body.source = body.source.toUpperCase();
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
 * Middleware: Validate GET /api/locations/mechanics/nearby query parameters
 */
const validateNearbyMechanicsQuery = (req, res, next) => {
  const errors = {};
  const { latitude, longitude, radius } = req.query;

  const latRes = validateCoordinate(latitude, LOCATION_LIMITS.MIN_LATITUDE, LOCATION_LIMITS.MAX_LATITUDE, 'latitude');
  if (!latRes.valid) {
    errors.latitude = latRes.error;
  } else {
    req.query.latitude = latRes.num;
  }

  const lonRes = validateCoordinate(longitude, LOCATION_LIMITS.MIN_LONGITUDE, LOCATION_LIMITS.MAX_LONGITUDE, 'longitude');
  if (!lonRes.valid) {
    errors.longitude = lonRes.error;
  } else {
    req.query.longitude = lonRes.num;
  }

  if (radius !== undefined && radius !== null && radius !== '') {
    const rad = Number(radius);
    if (isNaN(rad) || !isFinite(rad) || rad < LOCATION_LIMITS.MIN_RADIUS_KM || rad > LOCATION_LIMITS.MAX_RADIUS_KM) {
      errors.radius = `Radius must be a positive number between ${LOCATION_LIMITS.MIN_RADIUS_KM} km and ${LOCATION_LIMITS.MAX_RADIUS_KM} km.`;
    } else {
      req.query.radius = rad;
    }
  } else {
    req.query.radius = LOCATION_LIMITS.DEFAULT_RADIUS_KM;
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
 * Middleware: Validate POST /api/locations/distance payload
 */
const validateDistancePayload = (req, res, next) => {
  const errors = {};
  const { origin, destination } = req.body || {};

  if (!origin || typeof origin !== 'object') {
    errors.origin = 'Origin object with latitude and longitude is required.';
  } else {
    const latRes = validateCoordinate(origin.latitude, LOCATION_LIMITS.MIN_LATITUDE, LOCATION_LIMITS.MAX_LATITUDE, 'origin.latitude');
    if (!latRes.valid) errors['origin.latitude'] = latRes.error;
    else origin.latitude = latRes.num;

    const lonRes = validateCoordinate(origin.longitude, LOCATION_LIMITS.MIN_LONGITUDE, LOCATION_LIMITS.MAX_LONGITUDE, 'origin.longitude');
    if (!lonRes.valid) errors['origin.longitude'] = lonRes.error;
    else origin.longitude = lonRes.num;
  }

  if (!destination || typeof destination !== 'object') {
    errors.destination = 'Destination object with latitude and longitude is required.';
  } else {
    const latRes = validateCoordinate(destination.latitude, LOCATION_LIMITS.MIN_LATITUDE, LOCATION_LIMITS.MAX_LATITUDE, 'destination.latitude');
    if (!latRes.valid) errors['destination.latitude'] = latRes.error;
    else destination.latitude = latRes.num;

    const lonRes = validateCoordinate(destination.longitude, LOCATION_LIMITS.MIN_LONGITUDE, LOCATION_LIMITS.MAX_LONGITUDE, 'destination.longitude');
    if (!lonRes.valid) errors['destination.longitude'] = lonRes.error;
    else destination.longitude = lonRes.num;
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
 * Middleware: Validate GET /api/locations/history query parameters
 */
const validateHistoryQuery = (req, res, next) => {
  const errors = {};
  const { page, limit, startDate, endDate } = req.query;

  if (page !== undefined && page !== null && page !== '') {
    const p = parseInt(page, 10);
    if (isNaN(p) || p < 1) {
      errors.page = 'Page must be a positive integer greater than or equal to 1.';
    } else {
      req.query.page = p;
    }
  } else {
    req.query.page = PAGINATION_LIMITS.DEFAULT_PAGE;
  }

  if (limit !== undefined && limit !== null && limit !== '') {
    const l = parseInt(limit, 10);
    if (isNaN(l) || l < 1 || l > PAGINATION_LIMITS.MAX_LIMIT) {
      errors.limit = `Limit must be a positive integer between 1 and ${PAGINATION_LIMITS.MAX_LIMIT}.`;
    } else {
      req.query.limit = l;
    }
  } else {
    req.query.limit = PAGINATION_LIMITS.DEFAULT_LIMIT;
  }

  if (startDate) {
    const d = new Date(startDate);
    if (isNaN(d.getTime())) {
      errors.startDate = 'startDate must be a valid ISO-8601 date string.';
    }
  }

  if (endDate) {
    const d = new Date(endDate);
    if (isNaN(d.getTime())) {
      errors.endDate = 'endDate must be a valid ISO-8601 date string.';
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
 * Middleware: Validate MongoDB ObjectId in req.params
 */
const validateMechanicIdParam = (req, res, next) => {
  const { mechanicId } = req.params;

  if (!mechanicId || !mongoose.Types.ObjectId.isValid(mechanicId)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: Invalid mechanic ID format.',
      error: { fields: { mechanicId: 'Invalid ObjectId format' } },
    });
  }

  next();
};

module.exports = {
  validateCustomerCurrentLocation,
  validateMechanicCurrentLocation,
  validateNearbyMechanicsQuery,
  validateDistancePayload,
  validateHistoryQuery,
  validateMechanicIdParam,
};
