const mongoose = require('mongoose');
const {
  PACKAGE_STATUS,
  VEHICLE_TYPES,
  PACKAGE_CATEGORIES,
  PACKAGE_LIMITS,
} = require('./servicePackage.constants');

// Forbidden fields that cannot be directly injected via client request body
const FORBIDDEN_FIELDS = ['createdBy', 'updatedBy', '_id', 'id', 'createdAt', 'updatedAt'];

/**
 * Middleware: Validate POST /api/service-packages payload
 */
const validateCreatePackage = (req, res, next) => {
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
    errors.name = 'Package name is required.';
  } else {
    const trimmed = body.name.trim();
    if (trimmed.length < PACKAGE_LIMITS.NAME_MIN_LENGTH || trimmed.length > PACKAGE_LIMITS.NAME_MAX_LENGTH) {
      errors.name = `Package name must be between ${PACKAGE_LIMITS.NAME_MIN_LENGTH} and ${PACKAGE_LIMITS.NAME_MAX_LENGTH} characters.`;
    }
  }

  // 3. description
  if (!body.description || typeof body.description !== 'string' || !body.description.trim()) {
    errors.description = 'Package description is required.';
  } else if (body.description.trim().length > PACKAGE_LIMITS.DESC_MAX_LENGTH) {
    errors.description = `Package description cannot exceed ${PACKAGE_LIMITS.DESC_MAX_LENGTH} characters.`;
  }

  // 4. shortDescription
  if (body.shortDescription !== undefined && body.shortDescription !== null) {
    if (typeof body.shortDescription !== 'string') {
      errors.shortDescription = 'Short description must be a string.';
    } else if (body.shortDescription.trim().length > PACKAGE_LIMITS.SHORT_DESC_MAX_LENGTH) {
      errors.shortDescription = `Short description cannot exceed ${PACKAGE_LIMITS.SHORT_DESC_MAX_LENGTH} characters.`;
    }
  }

  // 5. category
  if (body.category !== undefined && body.category !== null) {
    if (typeof body.category !== 'string') {
      errors.category = 'Package category must be a string.';
    } else {
      const normalizedCategory = body.category.toUpperCase().trim();
      if (!Object.values(PACKAGE_CATEGORIES).includes(normalizedCategory)) {
        errors.category = `Invalid package category. Allowed values: ${Object.values(PACKAGE_CATEGORIES).join(', ')}.`;
      } else {
        req.body.category = normalizedCategory;
      }
    }
  }

  // 6. services
  if (!body.services) {
    errors.services = 'Services array is required.';
  } else if (!Array.isArray(body.services) || body.services.length === 0) {
    errors.services = 'Services must be a non-empty array of Service IDs.';
  } else {
    const seenServices = new Set();
    let hasInvalidId = false;
    let hasDuplicates = false;

    for (const serviceId of body.services) {
      if (!serviceId || typeof serviceId !== 'string' || !mongoose.Types.ObjectId.isValid(serviceId.trim())) {
        hasInvalidId = true;
        break;
      }
      const trimmedId = serviceId.trim();
      if (seenServices.has(trimmedId)) {
        hasDuplicates = true;
        break;
      }
      seenServices.add(trimmedId);
    }

    if (hasInvalidId) {
      errors.services = 'Every service ID must be a valid MongoDB ObjectId string.';
    } else if (hasDuplicates) {
      errors.services = 'Duplicate service IDs within the same package are not allowed.';
    } else {
      req.body.services = Array.from(seenServices);
    }
  }

  // 7. vehicleTypes
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
      req.body.vehicleTypes = [...new Set(normalizedTypes)];
    }
  }

  // 8. basePrice
  if (body.basePrice === undefined || body.basePrice === null || body.basePrice === '') {
    errors.basePrice = 'Base price is required.';
  } else {
    const price = Number(body.basePrice);
    if (isNaN(price) || price < PACKAGE_LIMITS.MIN_PRICE || price > PACKAGE_LIMITS.MAX_PRICE) {
      errors.basePrice = `Base price must be a valid number between ${PACKAGE_LIMITS.MIN_PRICE} and ${PACKAGE_LIMITS.MAX_PRICE}.`;
    }
  }

  // 9. estimatedDuration
  if (body.estimatedDuration === undefined || body.estimatedDuration === null || body.estimatedDuration === '') {
    errors.estimatedDuration = 'Estimated duration (in minutes) is required.';
  } else {
    const duration = Number(body.estimatedDuration);
    if (isNaN(duration) || !Number.isInteger(duration) || duration < PACKAGE_LIMITS.MIN_DURATION || duration > PACKAGE_LIMITS.MAX_DURATION) {
      errors.estimatedDuration = `Estimated duration must be an integer between ${PACKAGE_LIMITS.MIN_DURATION} and ${PACKAGE_LIMITS.MAX_DURATION} minutes.`;
    }
  }

  // 10. image
  if (body.image !== undefined && body.image !== null) {
    if (typeof body.image !== 'string') {
      errors.image = 'Image must be a string URL.';
    }
  }

  // 11. benefits
  if (body.benefits !== undefined && body.benefits !== null) {
    if (!Array.isArray(body.benefits)) {
      errors.benefits = 'Benefits must be an array of strings.';
    } else if (body.benefits.length > PACKAGE_LIMITS.MAX_BENEFITS) {
      errors.benefits = `Benefits cannot contain more than ${PACKAGE_LIMITS.MAX_BENEFITS} items.`;
    } else {
      const sanitizedBenefits = [];
      for (const benefit of body.benefits) {
        if (typeof benefit !== 'string' || !benefit.trim()) {
          errors.benefits = 'Each benefit must be a non-empty string.';
          break;
        }
        if (benefit.trim().length > PACKAGE_LIMITS.BENEFIT_MAX_LENGTH) {
          errors.benefits = `Each benefit cannot exceed ${PACKAGE_LIMITS.BENEFIT_MAX_LENGTH} characters.`;
          break;
        }
        sanitizedBenefits.push(benefit.trim());
      }
      req.body.benefits = sanitizedBenefits;
    }
  }

  // 12. isPopular
  if (body.isPopular !== undefined && typeof body.isPopular !== 'boolean') {
    errors.isPopular = 'isPopular must be a boolean.';
  }

  // 13. displayOrder
  if (body.displayOrder !== undefined && body.displayOrder !== null) {
    const order = Number(body.displayOrder);
    if (isNaN(order) || !Number.isInteger(order) || order < PACKAGE_LIMITS.MIN_DISPLAY_ORDER) {
      errors.displayOrder = 'Display order must be a non-negative integer.';
    }
  }

  // 14. status
  if (body.status !== undefined && body.status !== null) {
    if (typeof body.status !== 'string') {
      errors.status = 'Status must be a string.';
    } else {
      const normalizedStatus = body.status.toUpperCase().trim();
      if (!Object.values(PACKAGE_STATUS).includes(normalizedStatus)) {
        errors.status = `Invalid status. Allowed values: ${Object.values(PACKAGE_STATUS).join(', ')}.`;
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
 * Middleware: Validate PUT /api/service-packages/:packageId payload
 */
const validateUpdatePackage = (req, res, next) => {
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
      errors.name = 'Package name cannot be empty.';
    } else {
      const trimmed = body.name.trim();
      if (trimmed.length < PACKAGE_LIMITS.NAME_MIN_LENGTH || trimmed.length > PACKAGE_LIMITS.NAME_MAX_LENGTH) {
        errors.name = `Package name must be between ${PACKAGE_LIMITS.NAME_MIN_LENGTH} and ${PACKAGE_LIMITS.NAME_MAX_LENGTH} characters.`;
      }
    }
  }

  // 3. description
  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || !body.description.trim()) {
      errors.description = 'Package description cannot be empty.';
    } else if (body.description.trim().length > PACKAGE_LIMITS.DESC_MAX_LENGTH) {
      errors.description = `Package description cannot exceed ${PACKAGE_LIMITS.DESC_MAX_LENGTH} characters.`;
    }
  }

  // 4. shortDescription
  if (body.shortDescription !== undefined && body.shortDescription !== null) {
    if (typeof body.shortDescription !== 'string') {
      errors.shortDescription = 'Short description must be a string.';
    } else if (body.shortDescription.trim().length > PACKAGE_LIMITS.SHORT_DESC_MAX_LENGTH) {
      errors.shortDescription = `Short description cannot exceed ${PACKAGE_LIMITS.SHORT_DESC_MAX_LENGTH} characters.`;
    }
  }

  // 5. category
  if (body.category !== undefined && body.category !== null) {
    if (typeof body.category !== 'string') {
      errors.category = 'Package category must be a string.';
    } else {
      const normalizedCategory = body.category.toUpperCase().trim();
      if (!Object.values(PACKAGE_CATEGORIES).includes(normalizedCategory)) {
        errors.category = `Invalid package category. Allowed values: ${Object.values(PACKAGE_CATEGORIES).join(', ')}.`;
      } else {
        req.body.category = normalizedCategory;
      }
    }
  }

  // 6. services
  if (body.services !== undefined) {
    if (!Array.isArray(body.services) || body.services.length === 0) {
      errors.services = 'Services must be a non-empty array of Service IDs.';
    } else {
      const seenServices = new Set();
      let hasInvalidId = false;
      let hasDuplicates = false;

      for (const serviceId of body.services) {
        if (!serviceId || typeof serviceId !== 'string' || !mongoose.Types.ObjectId.isValid(serviceId.trim())) {
          hasInvalidId = true;
          break;
        }
        const trimmedId = serviceId.trim();
        if (seenServices.has(trimmedId)) {
          hasDuplicates = true;
          break;
        }
        seenServices.add(trimmedId);
      }

      if (hasInvalidId) {
        errors.services = 'Every service ID must be a valid MongoDB ObjectId string.';
      } else if (hasDuplicates) {
        errors.services = 'Duplicate service IDs within the same package are not allowed.';
      } else {
        req.body.services = Array.from(seenServices);
      }
    }
  }

  // 7. vehicleTypes
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
      req.body.vehicleTypes = [...new Set(normalizedTypes)];
    }
  }

  // 8. basePrice
  if (body.basePrice !== undefined) {
    const price = Number(body.basePrice);
    if (isNaN(price) || price < PACKAGE_LIMITS.MIN_PRICE || price > PACKAGE_LIMITS.MAX_PRICE) {
      errors.basePrice = `Base price must be a valid number between ${PACKAGE_LIMITS.MIN_PRICE} and ${PACKAGE_LIMITS.MAX_PRICE}.`;
    }
  }

  // 9. estimatedDuration
  if (body.estimatedDuration !== undefined) {
    const duration = Number(body.estimatedDuration);
    if (isNaN(duration) || !Number.isInteger(duration) || duration < PACKAGE_LIMITS.MIN_DURATION || duration > PACKAGE_LIMITS.MAX_DURATION) {
      errors.estimatedDuration = `Estimated duration must be an integer between ${PACKAGE_LIMITS.MIN_DURATION} and ${PACKAGE_LIMITS.MAX_DURATION} minutes.`;
    }
  }

  // 10. image
  if (body.image !== undefined && body.image !== null) {
    if (typeof body.image !== 'string') {
      errors.image = 'Image must be a string URL.';
    }
  }

  // 11. benefits
  if (body.benefits !== undefined && body.benefits !== null) {
    if (!Array.isArray(body.benefits)) {
      errors.benefits = 'Benefits must be an array of strings.';
    } else if (body.benefits.length > PACKAGE_LIMITS.MAX_BENEFITS) {
      errors.benefits = `Benefits cannot contain more than ${PACKAGE_LIMITS.MAX_BENEFITS} items.`;
    } else {
      const sanitizedBenefits = [];
      for (const benefit of body.benefits) {
        if (typeof benefit !== 'string' || !benefit.trim()) {
          errors.benefits = 'Each benefit must be a non-empty string.';
          break;
        }
        if (benefit.trim().length > PACKAGE_LIMITS.BENEFIT_MAX_LENGTH) {
          errors.benefits = `Each benefit cannot exceed ${PACKAGE_LIMITS.BENEFIT_MAX_LENGTH} characters.`;
          break;
        }
        sanitizedBenefits.push(benefit.trim());
      }
      req.body.benefits = sanitizedBenefits;
    }
  }

  // 12. isPopular
  if (body.isPopular !== undefined && typeof body.isPopular !== 'boolean') {
    errors.isPopular = 'isPopular must be a boolean.';
  }

  // 13. displayOrder
  if (body.displayOrder !== undefined && body.displayOrder !== null) {
    const order = Number(body.displayOrder);
    if (isNaN(order) || !Number.isInteger(order) || order < PACKAGE_LIMITS.MIN_DISPLAY_ORDER) {
      errors.displayOrder = 'Display order must be a non-negative integer.';
    }
  }

  // 14. status
  if (body.status !== undefined && body.status !== null) {
    if (typeof body.status !== 'string') {
      errors.status = 'Status must be a string.';
    } else {
      const normalizedStatus = body.status.toUpperCase().trim();
      if (!Object.values(PACKAGE_STATUS).includes(normalizedStatus)) {
        errors.status = `Invalid status. Allowed values: ${Object.values(PACKAGE_STATUS).join(', ')}.`;
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
 * Middleware: Validate PATCH /api/service-packages/:packageId/status payload
 */
const validateUpdatePackageStatus = (req, res, next) => {
  const { status } = req.body || {};

  if (!status || typeof status !== 'string' || !status.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: { fields: { status: 'Status is required.' } },
    });
  }

  const normalizedStatus = status.toUpperCase().trim();
  if (!Object.values(PACKAGE_STATUS).includes(normalizedStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        fields: {
          status: `Invalid status. Allowed values: ${Object.values(PACKAGE_STATUS).join(', ')}.`,
        },
      },
    });
  }

  req.body.status = normalizedStatus;
  next();
};

module.exports = {
  validateCreatePackage,
  validateUpdatePackage,
  validateUpdatePackageStatus,
};
