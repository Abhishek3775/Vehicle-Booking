const {
  SERVICE_CATEGORIES,
  VEHICLE_TYPES,
  SERVICE_STATUS,
  SERVICE_LIMITS,
} = require('./service.constants');

// Forbidden fields that cannot be directly passed via client payload
const FORBIDDEN_FIELDS = ['createdBy', 'updatedBy', '_id', 'id', 'createdAt', 'updatedAt'];

/**
 * Middleware: Validate POST /api/services payload
 */
const validateCreateService = (req, res, next) => {
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

  // 2. name
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    errors.name = 'Service name is required.';
  } else {
    const trimmed = body.name.trim();
    if (trimmed.length < SERVICE_LIMITS.NAME_MIN_LENGTH || trimmed.length > SERVICE_LIMITS.NAME_MAX_LENGTH) {
      errors.name = `Service name must be between ${SERVICE_LIMITS.NAME_MIN_LENGTH} and ${SERVICE_LIMITS.NAME_MAX_LENGTH} characters.`;
    }
  }

  // 3. description
  if (!body.description || typeof body.description !== 'string' || !body.description.trim()) {
    errors.description = 'Service description is required.';
  } else if (body.description.trim().length > SERVICE_LIMITS.DESC_MAX_LENGTH) {
    errors.description = `Service description cannot exceed ${SERVICE_LIMITS.DESC_MAX_LENGTH} characters.`;
  }

  // 4. shortDescription
  if (body.shortDescription !== undefined && body.shortDescription !== null) {
    if (typeof body.shortDescription !== 'string') {
      errors.shortDescription = 'Short description must be a string.';
    } else if (body.shortDescription.trim().length > SERVICE_LIMITS.SHORT_DESC_MAX_LENGTH) {
      errors.shortDescription = `Short description cannot exceed ${SERVICE_LIMITS.SHORT_DESC_MAX_LENGTH} characters.`;
    }
  }

  // 5. category
  if (!body.category || typeof body.category !== 'string') {
    errors.category = 'Service category is required.';
  } else {
    const normalizedCategory = body.category.toUpperCase().trim();
    if (!Object.values(SERVICE_CATEGORIES).includes(normalizedCategory)) {
      errors.category = `Invalid service category. Allowed values: ${Object.values(SERVICE_CATEGORIES).join(', ')}.`;
    } else {
      req.body.category = normalizedCategory;
    }
  }

  // 6. vehicleTypes
  if (body.vehicleTypes !== undefined && body.vehicleTypes !== null) {
    if (!Array.isArray(body.vehicleTypes) || body.vehicleTypes.length === 0) {
      errors.vehicleTypes = 'vehicleTypes must be a non-empty array of vehicle types.';
    } else {
      const normalizedTypes = [];
      for (const vt of body.vehicleTypes) {
        if (typeof vt !== 'string' || !Object.values(VEHICLE_TYPES).includes(vt.toUpperCase().trim())) {
          errors.vehicleTypes = `Invalid vehicle type '${vt}'. Allowed values: ${Object.values(VEHICLE_TYPES).join(', ')}.`;
          break;
        }
        normalizedTypes.push(vt.toUpperCase().trim());
      }
      req.body.vehicleTypes = normalizedTypes;
    }
  }

  // 7. estimatedDuration
  if (body.estimatedDuration === undefined || body.estimatedDuration === null || body.estimatedDuration === '') {
    errors.estimatedDuration = 'Estimated duration (in minutes) is required.';
  } else {
    const duration = Number(body.estimatedDuration);
    if (isNaN(duration) || !Number.isInteger(duration) || duration < SERVICE_LIMITS.MIN_DURATION || duration > SERVICE_LIMITS.MAX_DURATION) {
      errors.estimatedDuration = `Estimated duration must be an integer between ${SERVICE_LIMITS.MIN_DURATION} and ${SERVICE_LIMITS.MAX_DURATION} minutes.`;
    }
  }

  // 8. basePrice
  if (body.basePrice === undefined || body.basePrice === null || body.basePrice === '') {
    errors.basePrice = 'Base price is required.';
  } else {
    const price = Number(body.basePrice);
    if (isNaN(price) || price < SERVICE_LIMITS.MIN_PRICE || price > SERVICE_LIMITS.MAX_PRICE) {
      errors.basePrice = `Base price must be a valid number between ${SERVICE_LIMITS.MIN_PRICE} and ${SERVICE_LIMITS.MAX_PRICE}.`;
    }
  }

  // 9. image
  if (body.image !== undefined && body.image !== null) {
    if (typeof body.image !== 'string') {
      errors.image = 'Image must be a string URL.';
    }
  }

  // 10. isEmergency
  if (body.isEmergency !== undefined && typeof body.isEmergency !== 'boolean') {
    errors.isEmergency = 'isEmergency must be a boolean.';
  }

  // 11. displayOrder
  if (body.displayOrder !== undefined && body.displayOrder !== null) {
    const order = Number(body.displayOrder);
    if (isNaN(order) || !Number.isInteger(order) || order < SERVICE_LIMITS.MIN_DISPLAY_ORDER) {
      errors.displayOrder = `Display order must be a non-negative integer.`;
    }
  }

  // 12. status
  if (body.status !== undefined && body.status !== null) {
    if (typeof body.status !== 'string') {
      errors.status = 'Status must be a string.';
    } else {
      const normalizedStatus = body.status.toUpperCase().trim();
      if (!Object.values(SERVICE_STATUS).includes(normalizedStatus)) {
        errors.status = `Invalid status. Allowed values: ${Object.values(SERVICE_STATUS).join(', ')}.`;
      } else {
        req.body.status = normalizedStatus;
      }
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
 * Middleware: Validate PUT /api/services/:serviceId payload
 */
const validateUpdateService = (req, res, next) => {
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

  // 2. name
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      errors.name = 'Service name cannot be empty.';
    } else {
      const trimmed = body.name.trim();
      if (trimmed.length < SERVICE_LIMITS.NAME_MIN_LENGTH || trimmed.length > SERVICE_LIMITS.NAME_MAX_LENGTH) {
        errors.name = `Service name must be between ${SERVICE_LIMITS.NAME_MIN_LENGTH} and ${SERVICE_LIMITS.NAME_MAX_LENGTH} characters.`;
      }
    }
  }

  // 3. description
  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || !body.description.trim()) {
      errors.description = 'Service description cannot be empty.';
    } else if (body.description.trim().length > SERVICE_LIMITS.DESC_MAX_LENGTH) {
      errors.description = `Service description cannot exceed ${SERVICE_LIMITS.DESC_MAX_LENGTH} characters.`;
    }
  }

  // 4. shortDescription
  if (body.shortDescription !== undefined && body.shortDescription !== null) {
    if (typeof body.shortDescription !== 'string') {
      errors.shortDescription = 'Short description must be a string.';
    } else if (body.shortDescription.trim().length > SERVICE_LIMITS.SHORT_DESC_MAX_LENGTH) {
      errors.shortDescription = `Short description cannot exceed ${SERVICE_LIMITS.SHORT_DESC_MAX_LENGTH} characters.`;
    }
  }

  // 5. category
  if (body.category !== undefined) {
    if (typeof body.category !== 'string') {
      errors.category = 'Service category must be a string.';
    } else {
      const normalizedCategory = body.category.toUpperCase().trim();
      if (!Object.values(SERVICE_CATEGORIES).includes(normalizedCategory)) {
        errors.category = `Invalid service category. Allowed values: ${Object.values(SERVICE_CATEGORIES).join(', ')}.`;
      } else {
        req.body.category = normalizedCategory;
      }
    }
  }

  // 6. vehicleTypes
  if (body.vehicleTypes !== undefined && body.vehicleTypes !== null) {
    if (!Array.isArray(body.vehicleTypes) || body.vehicleTypes.length === 0) {
      errors.vehicleTypes = 'vehicleTypes must be a non-empty array of vehicle types.';
    } else {
      const normalizedTypes = [];
      for (const vt of body.vehicleTypes) {
        if (typeof vt !== 'string' || !Object.values(VEHICLE_TYPES).includes(vt.toUpperCase().trim())) {
          errors.vehicleTypes = `Invalid vehicle type '${vt}'. Allowed values: ${Object.values(VEHICLE_TYPES).join(', ')}.`;
          break;
        }
        normalizedTypes.push(vt.toUpperCase().trim());
      }
      req.body.vehicleTypes = normalizedTypes;
    }
  }

  // 7. estimatedDuration
  if (body.estimatedDuration !== undefined) {
    const duration = Number(body.estimatedDuration);
    if (isNaN(duration) || !Number.isInteger(duration) || duration < SERVICE_LIMITS.MIN_DURATION || duration > SERVICE_LIMITS.MAX_DURATION) {
      errors.estimatedDuration = `Estimated duration must be an integer between ${SERVICE_LIMITS.MIN_DURATION} and ${SERVICE_LIMITS.MAX_DURATION} minutes.`;
    }
  }

  // 8. basePrice
  if (body.basePrice !== undefined) {
    const price = Number(body.basePrice);
    if (isNaN(price) || price < SERVICE_LIMITS.MIN_PRICE || price > SERVICE_LIMITS.MAX_PRICE) {
      errors.basePrice = `Base price must be a valid number between ${SERVICE_LIMITS.MIN_PRICE} and ${SERVICE_LIMITS.MAX_PRICE}.`;
    }
  }

  // 9. image
  if (body.image !== undefined && body.image !== null) {
    if (typeof body.image !== 'string') {
      errors.image = 'Image must be a string URL.';
    }
  }

  // 10. isEmergency
  if (body.isEmergency !== undefined && typeof body.isEmergency !== 'boolean') {
    errors.isEmergency = 'isEmergency must be a boolean.';
  }

  // 11. displayOrder
  if (body.displayOrder !== undefined && body.displayOrder !== null) {
    const order = Number(body.displayOrder);
    if (isNaN(order) || !Number.isInteger(order) || order < SERVICE_LIMITS.MIN_DISPLAY_ORDER) {
      errors.displayOrder = `Display order must be a non-negative integer.`;
    }
  }

  // 12. status
  if (body.status !== undefined && body.status !== null) {
    if (typeof body.status !== 'string') {
      errors.status = 'Status must be a string.';
    } else {
      const normalizedStatus = body.status.toUpperCase().trim();
      if (!Object.values(SERVICE_STATUS).includes(normalizedStatus)) {
        errors.status = `Invalid status. Allowed values: ${Object.values(SERVICE_STATUS).join(', ')}.`;
      } else {
        req.body.status = normalizedStatus;
      }
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
 * Middleware: Validate PATCH /api/services/:serviceId/status payload
 */
const validateUpdateStatus = (req, res, next) => {
  const { status } = req.body || {};

  if (!status || typeof status !== 'string' || !status.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: { fields: { status: 'Status is required.' } },
    });
  }

  const normalizedStatus = status.toUpperCase().trim();
  if (!Object.values(SERVICE_STATUS).includes(normalizedStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        fields: {
          status: `Invalid status. Allowed values: ${Object.values(SERVICE_STATUS).join(', ')}.`,
        },
      },
    });
  }

  req.body.status = normalizedStatus;
  next();
};

module.exports = {
  validateCreateService,
  validateUpdateService,
  validateUpdateStatus,
};
