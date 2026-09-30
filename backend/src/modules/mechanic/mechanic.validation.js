const mongoose = require('mongoose');
const {
  AVAILABILITY_STATUS,
  WORK_STATUS,
  VERIFICATION_STATUS,
  VEHICLE_TYPES,
  SPECIALIZATIONS,
  MECHANIC_LIMITS,
} = require('./mechanic.constants');

const FORBIDDEN_CREATE_FIELDS = [
  'ratingSummary',
  'completedJobs',
  'cancelledJobs',
  'mechanicCode',
  '_id',
  'id',
  'createdAt',
  'updatedAt',
];

const FORBIDDEN_UPDATE_FIELDS = [
  'userId',
  'mechanicCode',
  'verificationStatus',
  'ratingSummary',
  'completedJobs',
  'cancelledJobs',
  '_id',
  'id',
  'createdAt',
  'updatedAt',
];

/**
 * Middleware: Validate mechanicId URL parameter
 */
const validateMechanicIdParam = (req, res, next) => {
  const { mechanicId } = req.params;

  if (!mechanicId || !mongoose.Types.ObjectId.isValid(mechanicId)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: Invalid mechanic ID format.',
      error: { fields: { mechanicId: 'Must be a valid 24-character hexadecimal MongoDB ObjectId.' } },
    });
  }

  next();
};

/**
 * Middleware: Validate POST /api/mechanics payload
 */
const validateCreateMechanic = (req, res, next) => {
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
  for (const field of FORBIDDEN_CREATE_FIELDS) {
    if (field in body) {
      errors[field] = `Providing '${field}' in creation payload is strictly prohibited.`;
    }
  }

  // 2. userId
  if (!body.userId || typeof body.userId !== 'string') {
    errors.userId = 'User ID is required.';
  } else if (!mongoose.Types.ObjectId.isValid(body.userId.trim())) {
    errors.userId = 'User ID must be a valid MongoDB ObjectId.';
  } else {
    req.body.userId = body.userId.trim();
  }

  // 3. displayName
  if (!body.displayName || typeof body.displayName !== 'string' || !body.displayName.trim()) {
    errors.displayName = 'Display name is required.';
  } else {
    const trimmed = body.displayName.trim();
    if (
      trimmed.length < MECHANIC_LIMITS.DISPLAY_NAME_MIN_LENGTH ||
      trimmed.length > MECHANIC_LIMITS.DISPLAY_NAME_MAX_LENGTH
    ) {
      errors.displayName = `Display name must be between ${MECHANIC_LIMITS.DISPLAY_NAME_MIN_LENGTH} and ${MECHANIC_LIMITS.DISPLAY_NAME_MAX_LENGTH} characters.`;
    } else {
      req.body.displayName = trimmed;
    }
  }

  // 4. phone
  if (body.phone !== undefined && body.phone !== null) {
    if (typeof body.phone !== 'string') {
      errors.phone = 'Phone must be a string.';
    } else {
      req.body.phone = body.phone.trim();
    }
  }

  // 5. experienceYears
  if (body.experienceYears !== undefined && body.experienceYears !== null && body.experienceYears !== '') {
    const exp = Number(body.experienceYears);
    if (
      isNaN(exp) ||
      !Number.isInteger(exp) ||
      exp < MECHANIC_LIMITS.MIN_EXPERIENCE_YEARS ||
      exp > MECHANIC_LIMITS.MAX_EXPERIENCE_YEARS
    ) {
      errors.experienceYears = `Experience years must be an integer between ${MECHANIC_LIMITS.MIN_EXPERIENCE_YEARS} and ${MECHANIC_LIMITS.MAX_EXPERIENCE_YEARS}.`;
    } else {
      req.body.experienceYears = exp;
    }
  }

  // 6. specialization
  if (body.specialization !== undefined && body.specialization !== null) {
    if (typeof body.specialization !== 'string') {
      errors.specialization = 'Specialization must be a string.';
    } else {
      const spec = body.specialization.toUpperCase().trim();
      if (!Object.values(SPECIALIZATIONS).includes(spec)) {
        errors.specialization = `Invalid specialization. Allowed values: ${Object.values(SPECIALIZATIONS).join(', ')}.`;
      } else {
        req.body.specialization = spec;
      }
    }
  }

  // 7. skills
  if (body.skills !== undefined && body.skills !== null) {
    if (!Array.isArray(body.skills)) {
      errors.skills = 'Skills must be an array of strings.';
    } else {
      const sanitizedSkills = [];
      for (const skill of body.skills) {
        if (typeof skill !== 'string' || !skill.trim()) {
          errors.skills = 'Each skill item must be a non-empty string.';
          break;
        }
        sanitizedSkills.push(skill.trim());
      }
      req.body.skills = sanitizedSkills;
    }
  }

  // 8. supportedVehicleTypes
  if (body.supportedVehicleTypes !== undefined && body.supportedVehicleTypes !== null) {
    if (!Array.isArray(body.supportedVehicleTypes) || body.supportedVehicleTypes.length === 0) {
      errors.supportedVehicleTypes = 'supportedVehicleTypes must be a non-empty array of vehicle types.';
    } else {
      const sanitizedTypes = [];
      for (const vt of body.supportedVehicleTypes) {
        if (typeof vt !== 'string') {
          errors.supportedVehicleTypes = `Invalid vehicle type format '${vt}'.`;
          break;
        }
        const normalized = vt.toUpperCase().trim();
        if (!Object.values(VEHICLE_TYPES).includes(normalized)) {
          errors.supportedVehicleTypes = `Invalid vehicle type '${vt}'. Allowed values: ${Object.values(VEHICLE_TYPES).join(', ')}.`;
          break;
        }
        sanitizedTypes.push(normalized);
      }
      req.body.supportedVehicleTypes = [...new Set(sanitizedTypes)];
    }
  }

  // 9. supportedServiceIds
  if (body.supportedServiceIds !== undefined && body.supportedServiceIds !== null) {
    if (!Array.isArray(body.supportedServiceIds)) {
      errors.supportedServiceIds = 'supportedServiceIds must be an array of Service ObjectIds.';
    } else {
      const sanitizedServiceIds = [];
      for (const sid of body.supportedServiceIds) {
        if (!sid || typeof sid !== 'string' || !mongoose.Types.ObjectId.isValid(sid.trim())) {
          errors.supportedServiceIds = `Invalid Service ObjectId '${sid}'.`;
          break;
        }
        sanitizedServiceIds.push(sid.trim());
      }
      req.body.supportedServiceIds = [...new Set(sanitizedServiceIds)];
    }
  }

  // 10. serviceRadius
  if (body.serviceRadius !== undefined && body.serviceRadius !== null && body.serviceRadius !== '') {
    const radius = Number(body.serviceRadius);
    if (
      isNaN(radius) ||
      radius < MECHANIC_LIMITS.MIN_SERVICE_RADIUS ||
      radius > MECHANIC_LIMITS.MAX_SERVICE_RADIUS
    ) {
      errors.serviceRadius = `Service radius must be a number between ${MECHANIC_LIMITS.MIN_SERVICE_RADIUS} and ${MECHANIC_LIMITS.MAX_SERVICE_RADIUS} km.`;
    } else {
      req.body.serviceRadius = radius;
    }
  }

  // 11. profileImage
  if (body.profileImage !== undefined && body.profileImage !== null) {
    if (typeof body.profileImage !== 'string') {
      errors.profileImage = 'Profile image must be a string URL.';
    }
  }

  // 12. notes
  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== 'string') {
      errors.notes = 'Notes must be a string.';
    } else {
      req.body.notes = body.notes.trim();
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
 * Middleware: Validate PUT /api/mechanics/:mechanicId payload
 */
const validateUpdateMechanic = (req, res, next) => {
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
  for (const field of FORBIDDEN_UPDATE_FIELDS) {
    if (field in body) {
      errors[field] = `Modifying '${field}' is strictly prohibited.`;
    }
  }

  // 2. displayName
  if (body.displayName !== undefined) {
    if (typeof body.displayName !== 'string' || !body.displayName.trim()) {
      errors.displayName = 'Display name cannot be empty.';
    } else {
      const trimmed = body.displayName.trim();
      if (
        trimmed.length < MECHANIC_LIMITS.DISPLAY_NAME_MIN_LENGTH ||
        trimmed.length > MECHANIC_LIMITS.DISPLAY_NAME_MAX_LENGTH
      ) {
        errors.displayName = `Display name must be between ${MECHANIC_LIMITS.DISPLAY_NAME_MIN_LENGTH} and ${MECHANIC_LIMITS.DISPLAY_NAME_MAX_LENGTH} characters.`;
      } else {
        req.body.displayName = trimmed;
      }
    }
  }

  // 3. phone
  if (body.phone !== undefined && body.phone !== null) {
    if (typeof body.phone !== 'string') {
      errors.phone = 'Phone must be a string.';
    } else {
      req.body.phone = body.phone.trim();
    }
  }

  // 4. experienceYears
  if (body.experienceYears !== undefined && body.experienceYears !== null) {
    const exp = Number(body.experienceYears);
    if (
      isNaN(exp) ||
      !Number.isInteger(exp) ||
      exp < MECHANIC_LIMITS.MIN_EXPERIENCE_YEARS ||
      exp > MECHANIC_LIMITS.MAX_EXPERIENCE_YEARS
    ) {
      errors.experienceYears = `Experience years must be an integer between ${MECHANIC_LIMITS.MIN_EXPERIENCE_YEARS} and ${MECHANIC_LIMITS.MAX_EXPERIENCE_YEARS}.`;
    } else {
      req.body.experienceYears = exp;
    }
  }

  // 5. specialization
  if (body.specialization !== undefined && body.specialization !== null) {
    if (typeof body.specialization !== 'string') {
      errors.specialization = 'Specialization must be a string.';
    } else {
      const spec = body.specialization.toUpperCase().trim();
      if (!Object.values(SPECIALIZATIONS).includes(spec)) {
        errors.specialization = `Invalid specialization. Allowed values: ${Object.values(SPECIALIZATIONS).join(', ')}.`;
      } else {
        req.body.specialization = spec;
      }
    }
  }

  // 6. skills
  if (body.skills !== undefined && body.skills !== null) {
    if (!Array.isArray(body.skills)) {
      errors.skills = 'Skills must be an array of strings.';
    } else {
      const sanitizedSkills = [];
      for (const skill of body.skills) {
        if (typeof skill !== 'string' || !skill.trim()) {
          errors.skills = 'Each skill item must be a non-empty string.';
          break;
        }
        sanitizedSkills.push(skill.trim());
      }
      req.body.skills = sanitizedSkills;
    }
  }

  // 7. supportedVehicleTypes
  if (body.supportedVehicleTypes !== undefined && body.supportedVehicleTypes !== null) {
    if (!Array.isArray(body.supportedVehicleTypes) || body.supportedVehicleTypes.length === 0) {
      errors.supportedVehicleTypes = 'supportedVehicleTypes must be a non-empty array of vehicle types.';
    } else {
      const sanitizedTypes = [];
      for (const vt of body.supportedVehicleTypes) {
        if (typeof vt !== 'string') {
          errors.supportedVehicleTypes = `Invalid vehicle type format '${vt}'.`;
          break;
        }
        const normalized = vt.toUpperCase().trim();
        if (!Object.values(VEHICLE_TYPES).includes(normalized)) {
          errors.supportedVehicleTypes = `Invalid vehicle type '${vt}'. Allowed values: ${Object.values(VEHICLE_TYPES).join(', ')}.`;
          break;
        }
        sanitizedTypes.push(normalized);
      }
      req.body.supportedVehicleTypes = [...new Set(sanitizedTypes)];
    }
  }

  // 8. supportedServiceIds
  if (body.supportedServiceIds !== undefined && body.supportedServiceIds !== null) {
    if (!Array.isArray(body.supportedServiceIds)) {
      errors.supportedServiceIds = 'supportedServiceIds must be an array of Service ObjectIds.';
    } else {
      const sanitizedServiceIds = [];
      for (const sid of body.supportedServiceIds) {
        if (!sid || typeof sid !== 'string' || !mongoose.Types.ObjectId.isValid(sid.trim())) {
          errors.supportedServiceIds = `Invalid Service ObjectId '${sid}'.`;
          break;
        }
        sanitizedServiceIds.push(sid.trim());
      }
      req.body.supportedServiceIds = [...new Set(sanitizedServiceIds)];
    }
  }

  // 9. serviceRadius
  if (body.serviceRadius !== undefined && body.serviceRadius !== null) {
    const radius = Number(body.serviceRadius);
    if (
      isNaN(radius) ||
      radius < MECHANIC_LIMITS.MIN_SERVICE_RADIUS ||
      radius > MECHANIC_LIMITS.MAX_SERVICE_RADIUS
    ) {
      errors.serviceRadius = `Service radius must be a number between ${MECHANIC_LIMITS.MIN_SERVICE_RADIUS} and ${MECHANIC_LIMITS.MAX_SERVICE_RADIUS} km.`;
    } else {
      req.body.serviceRadius = radius;
    }
  }

  // 10. profileImage
  if (body.profileImage !== undefined && body.profileImage !== null) {
    if (typeof body.profileImage !== 'string') {
      errors.profileImage = 'Profile image must be a string URL.';
    }
  }

  // 11. notes
  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== 'string') {
      errors.notes = 'Notes must be a string.';
    } else {
      req.body.notes = body.notes.trim();
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
 * Middleware: Validate PATCH /api/mechanics/:mechanicId/availability payload
 */
const validateUpdateAvailability = (req, res, next) => {
  const { availabilityStatus } = req.body || {};

  if (!availabilityStatus || typeof availabilityStatus !== 'string' || !availabilityStatus.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: { fields: { availabilityStatus: 'availabilityStatus is required.' } },
    });
  }

  const normalized = availabilityStatus.toUpperCase().trim();
  if (!Object.values(AVAILABILITY_STATUS).includes(normalized)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        fields: {
          availabilityStatus: `Invalid status. Allowed values: ${Object.values(AVAILABILITY_STATUS).join(', ')}.`,
        },
      },
    });
  }

  req.body.availabilityStatus = normalized;
  next();
};

/**
 * Middleware: Validate PATCH /api/mechanics/:mechanicId/work-status payload
 */
const validateUpdateWorkStatus = (req, res, next) => {
  const { workStatus } = req.body || {};

  if (!workStatus || typeof workStatus !== 'string' || !workStatus.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: { fields: { workStatus: 'workStatus is required.' } },
    });
  }

  const normalized = workStatus.toUpperCase().trim();
  if (!Object.values(WORK_STATUS).includes(normalized)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        fields: {
          workStatus: `Invalid work status. Allowed values: ${Object.values(WORK_STATUS).join(', ')}.`,
        },
      },
    });
  }

  req.body.workStatus = normalized;
  next();
};

/**
 * Middleware: Validate PATCH /api/mechanics/:mechanicId/location payload
 */
const validateUpdateLocation = (req, res, next) => {
  const { latitude, longitude } = req.body || {};
  const errors = {};

  if (latitude === undefined || latitude === null || latitude === '') {
    errors.latitude = 'Latitude is required.';
  } else {
    const lat = Number(latitude);
    if (isNaN(lat) || lat < MECHANIC_LIMITS.MIN_LATITUDE || lat > MECHANIC_LIMITS.MAX_LATITUDE) {
      errors.latitude = `Latitude must be a valid number between ${MECHANIC_LIMITS.MIN_LATITUDE} and ${MECHANIC_LIMITS.MAX_LATITUDE}.`;
    } else {
      req.body.latitude = lat;
    }
  }

  if (longitude === undefined || longitude === null || longitude === '') {
    errors.longitude = 'Longitude is required.';
  } else {
    const lon = Number(longitude);
    if (isNaN(lon) || lon < MECHANIC_LIMITS.MIN_LONGITUDE || lon > MECHANIC_LIMITS.MAX_LONGITUDE) {
      errors.longitude = `Longitude must be a valid number between ${MECHANIC_LIMITS.MIN_LONGITUDE} and ${MECHANIC_LIMITS.MAX_LONGITUDE}.`;
    } else {
      req.body.longitude = lon;
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
 * Middleware: Validate PATCH /api/mechanics/:mechanicId/verification payload
 */
const validateUpdateVerification = (req, res, next) => {
  const { verificationStatus, notes } = req.body || {};
  const errors = {};

  if (!verificationStatus || typeof verificationStatus !== 'string' || !verificationStatus.trim()) {
    errors.verificationStatus = 'verificationStatus is required.';
  } else {
    const normalized = verificationStatus.toUpperCase().trim();
    if (!Object.values(VERIFICATION_STATUS).includes(normalized)) {
      errors.verificationStatus = `Invalid verification status. Allowed values: ${Object.values(VERIFICATION_STATUS).join(', ')}.`;
    } else {
      req.body.verificationStatus = normalized;
    }
  }

  if (notes !== undefined && notes !== null) {
    if (typeof notes !== 'string') {
      errors.notes = 'Notes must be a string.';
    } else {
      req.body.notes = notes.trim();
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
  validateMechanicIdParam,
  validateCreateMechanic,
  validateUpdateMechanic,
  validateUpdateAvailability,
  validateUpdateWorkStatus,
  validateUpdateLocation,
  validateUpdateVerification,
};
