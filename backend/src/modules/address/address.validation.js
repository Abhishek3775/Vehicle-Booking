const {
  ADDRESS_LABELS,
  ADDRESS_TYPES,
  ADDRESS_LIMITS,
} = require('./address.constants');

// Phone regex: 10 to 15 digits, optional leading +
const PHONE_REGEX = /^\+?[1-9]\d{9,14}$/;

// Postal code regex: accepts standard pin codes / postal codes 4 to 10 alphanumeric characters
const POSTAL_CODE_REGEX = /^[A-Z0-9\s-]{4,10}$/i;

// Forbidden fields that cannot be altered via request body
const FORBIDDEN_FIELDS = ['userId', 'status', 'createdAt', 'updatedAt', '_id', 'id'];

/**
 * Normalizes phone number
 * @param {string} phone
 * @returns {string}
 */
const sanitizePhone = (phone) => {
  if (typeof phone !== 'string') return '';
  return phone.replace(/[\s-]/g, '').trim();
};

/**
 * Middleware: Validate POST /api/addresses payload
 */
const validateAddAddress = (req, res, next) => {
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

  // 2. label
  if (body.label !== undefined && body.label !== null) {
    if (typeof body.label !== 'string') {
      errors.label = 'Address label must be a string.';
    } else {
      const normalizedLabel = body.label.toUpperCase().trim();
      if (!Object.values(ADDRESS_LABELS).includes(normalizedLabel)) {
        errors.label = `Invalid address label. Allowed values: ${Object.values(ADDRESS_LABELS).join(', ')}.`;
      } else {
        req.body.label = normalizedLabel;
      }
    }
  }

  // 3. fullName
  if (!body.fullName || typeof body.fullName !== 'string' || !body.fullName.trim()) {
    errors.fullName = 'Full name is required.';
  } else {
    const trimmed = body.fullName.trim();
    if (trimmed.length < ADDRESS_LIMITS.FULL_NAME_MIN_LENGTH || trimmed.length > ADDRESS_LIMITS.FULL_NAME_MAX_LENGTH) {
      errors.fullName = `Full name must be between ${ADDRESS_LIMITS.FULL_NAME_MIN_LENGTH} and ${ADDRESS_LIMITS.FULL_NAME_MAX_LENGTH} characters.`;
    }
  }

  // 4. phone
  if (!body.phone || typeof body.phone !== 'string' || !body.phone.trim()) {
    errors.phone = 'Phone number is required.';
  } else {
    const sanitized = sanitizePhone(body.phone);
    if (!PHONE_REGEX.test(sanitized)) {
      errors.phone = 'Invalid phone number format. Must contain 10 to 15 digits.';
    } else {
      req.body.phone = sanitized;
    }
  }

  // 5. addressLine1
  if (!body.addressLine1 || typeof body.addressLine1 !== 'string' || !body.addressLine1.trim()) {
    errors.addressLine1 = 'Address line 1 is required.';
  } else {
    const trimmed = body.addressLine1.trim();
    if (trimmed.length < ADDRESS_LIMITS.ADDRESS_LINE1_MIN_LENGTH || trimmed.length > ADDRESS_LIMITS.ADDRESS_LINE1_MAX_LENGTH) {
      errors.addressLine1 = `Address line 1 must be between ${ADDRESS_LIMITS.ADDRESS_LINE1_MIN_LENGTH} and ${ADDRESS_LIMITS.ADDRESS_LINE1_MAX_LENGTH} characters.`;
    }
  }

  // 6. addressLine2
  if (body.addressLine2 !== undefined && body.addressLine2 !== null) {
    if (typeof body.addressLine2 !== 'string') {
      errors.addressLine2 = 'Address line 2 must be a string.';
    } else if (body.addressLine2.trim().length > ADDRESS_LIMITS.ADDRESS_LINE2_MAX_LENGTH) {
      errors.addressLine2 = `Address line 2 cannot exceed ${ADDRESS_LIMITS.ADDRESS_LINE2_MAX_LENGTH} characters.`;
    }
  }

  // 7. landmark
  if (body.landmark !== undefined && body.landmark !== null) {
    if (typeof body.landmark !== 'string') {
      errors.landmark = 'Landmark must be a string.';
    } else if (body.landmark.trim().length > ADDRESS_LIMITS.LANDMARK_MAX_LENGTH) {
      errors.landmark = `Landmark cannot exceed ${ADDRESS_LIMITS.LANDMARK_MAX_LENGTH} characters.`;
    }
  }

  // 8. city
  if (!body.city || typeof body.city !== 'string' || !body.city.trim()) {
    errors.city = 'City is required.';
  } else {
    const trimmed = body.city.trim();
    if (trimmed.length < ADDRESS_LIMITS.CITY_MIN_LENGTH || trimmed.length > ADDRESS_LIMITS.CITY_MAX_LENGTH) {
      errors.city = `City must be between ${ADDRESS_LIMITS.CITY_MIN_LENGTH} and ${ADDRESS_LIMITS.CITY_MAX_LENGTH} characters.`;
    }
  }

  // 9. state
  if (!body.state || typeof body.state !== 'string' || !body.state.trim()) {
    errors.state = 'State is required.';
  } else {
    const trimmed = body.state.trim();
    if (trimmed.length < ADDRESS_LIMITS.STATE_MIN_LENGTH || trimmed.length > ADDRESS_LIMITS.STATE_MAX_LENGTH) {
      errors.state = `State must be between ${ADDRESS_LIMITS.STATE_MIN_LENGTH} and ${ADDRESS_LIMITS.STATE_MAX_LENGTH} characters.`;
    }
  }

  // 10. country
  if (body.country !== undefined && body.country !== null && body.country !== '') {
    if (typeof body.country !== 'string') {
      errors.country = 'Country must be a string.';
    } else if (body.country.trim().length > ADDRESS_LIMITS.COUNTRY_MAX_LENGTH) {
      errors.country = `Country cannot exceed ${ADDRESS_LIMITS.COUNTRY_MAX_LENGTH} characters.`;
    }
  }

  // 11. postalCode
  if (!body.postalCode || typeof body.postalCode !== 'string' || !body.postalCode.trim()) {
    errors.postalCode = 'Postal code is required.';
  } else {
    const trimmed = body.postalCode.trim();
    if (!POSTAL_CODE_REGEX.test(trimmed)) {
      errors.postalCode = 'Invalid postal code format.';
    }
  }

  // 12. latitude & longitude
  if (body.latitude !== undefined && body.latitude !== null && body.latitude !== '') {
    const lat = Number(body.latitude);
    if (isNaN(lat) || lat < ADDRESS_LIMITS.MIN_LATITUDE || lat > ADDRESS_LIMITS.MAX_LATITUDE) {
      errors.latitude = `Latitude must be a valid number between ${ADDRESS_LIMITS.MIN_LATITUDE} and ${ADDRESS_LIMITS.MAX_LATITUDE}.`;
    }
  }

  if (body.longitude !== undefined && body.longitude !== null && body.longitude !== '') {
    const lng = Number(body.longitude);
    if (isNaN(lng) || lng < ADDRESS_LIMITS.MIN_LONGITUDE || lng > ADDRESS_LIMITS.MAX_LONGITUDE) {
      errors.longitude = `Longitude must be a valid number between ${ADDRESS_LIMITS.MIN_LONGITUDE} and ${ADDRESS_LIMITS.MAX_LONGITUDE}.`;
    }
  }

  // 13. addressType
  if (body.addressType !== undefined && body.addressType !== null && body.addressType !== '') {
    if (typeof body.addressType !== 'string') {
      errors.addressType = 'Address type must be a string.';
    } else {
      const normalizedType = body.addressType.toUpperCase().trim();
      if (!Object.values(ADDRESS_TYPES).includes(normalizedType)) {
        errors.addressType = `Invalid address type. Allowed values: ${Object.values(ADDRESS_TYPES).join(', ')}.`;
      } else {
        req.body.addressType = normalizedType;
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
 * Middleware: Validate PUT /api/addresses/:addressId payload
 */
const validateUpdateAddress = (req, res, next) => {
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

  // 2. label
  if (body.label !== undefined) {
    if (typeof body.label !== 'string') {
      errors.label = 'Address label must be a string.';
    } else {
      const normalizedLabel = body.label.toUpperCase().trim();
      if (!Object.values(ADDRESS_LABELS).includes(normalizedLabel)) {
        errors.label = `Invalid address label. Allowed values: ${Object.values(ADDRESS_LABELS).join(', ')}.`;
      } else {
        req.body.label = normalizedLabel;
      }
    }
  }

  // 3. fullName
  if (body.fullName !== undefined) {
    if (typeof body.fullName !== 'string' || !body.fullName.trim()) {
      errors.fullName = 'Full name cannot be empty.';
    } else {
      const trimmed = body.fullName.trim();
      if (trimmed.length < ADDRESS_LIMITS.FULL_NAME_MIN_LENGTH || trimmed.length > ADDRESS_LIMITS.FULL_NAME_MAX_LENGTH) {
        errors.fullName = `Full name must be between ${ADDRESS_LIMITS.FULL_NAME_MIN_LENGTH} and ${ADDRESS_LIMITS.FULL_NAME_MAX_LENGTH} characters.`;
      }
    }
  }

  // 4. phone
  if (body.phone !== undefined) {
    if (typeof body.phone !== 'string' || !body.phone.trim()) {
      errors.phone = 'Phone number cannot be empty.';
    } else {
      const sanitized = sanitizePhone(body.phone);
      if (!PHONE_REGEX.test(sanitized)) {
        errors.phone = 'Invalid phone number format. Must contain 10 to 15 digits.';
      } else {
        req.body.phone = sanitized;
      }
    }
  }

  // 5. addressLine1
  if (body.addressLine1 !== undefined) {
    if (typeof body.addressLine1 !== 'string' || !body.addressLine1.trim()) {
      errors.addressLine1 = 'Address line 1 cannot be empty.';
    } else {
      const trimmed = body.addressLine1.trim();
      if (trimmed.length < ADDRESS_LIMITS.ADDRESS_LINE1_MIN_LENGTH || trimmed.length > ADDRESS_LIMITS.ADDRESS_LINE1_MAX_LENGTH) {
        errors.addressLine1 = `Address line 1 must be between ${ADDRESS_LIMITS.ADDRESS_LINE1_MIN_LENGTH} and ${ADDRESS_LIMITS.ADDRESS_LINE1_MAX_LENGTH} characters.`;
      }
    }
  }

  // 6. addressLine2
  if (body.addressLine2 !== undefined && body.addressLine2 !== null) {
    if (typeof body.addressLine2 !== 'string') {
      errors.addressLine2 = 'Address line 2 must be a string.';
    } else if (body.addressLine2.trim().length > ADDRESS_LIMITS.ADDRESS_LINE2_MAX_LENGTH) {
      errors.addressLine2 = `Address line 2 cannot exceed ${ADDRESS_LIMITS.ADDRESS_LINE2_MAX_LENGTH} characters.`;
    }
  }

  // 7. landmark
  if (body.landmark !== undefined && body.landmark !== null) {
    if (typeof body.landmark !== 'string') {
      errors.landmark = 'Landmark must be a string.';
    } else if (body.landmark.trim().length > ADDRESS_LIMITS.LANDMARK_MAX_LENGTH) {
      errors.landmark = `Landmark cannot exceed ${ADDRESS_LIMITS.LANDMARK_MAX_LENGTH} characters.`;
    }
  }

  // 8. city
  if (body.city !== undefined) {
    if (typeof body.city !== 'string' || !body.city.trim()) {
      errors.city = 'City cannot be empty.';
    } else {
      const trimmed = body.city.trim();
      if (trimmed.length < ADDRESS_LIMITS.CITY_MIN_LENGTH || trimmed.length > ADDRESS_LIMITS.CITY_MAX_LENGTH) {
        errors.city = `City must be between ${ADDRESS_LIMITS.CITY_MIN_LENGTH} and ${ADDRESS_LIMITS.CITY_MAX_LENGTH} characters.`;
      }
    }
  }

  // 9. state
  if (body.state !== undefined) {
    if (typeof body.state !== 'string' || !body.state.trim()) {
      errors.state = 'State cannot be empty.';
    } else {
      const trimmed = body.state.trim();
      if (trimmed.length < ADDRESS_LIMITS.STATE_MIN_LENGTH || trimmed.length > ADDRESS_LIMITS.STATE_MAX_LENGTH) {
        errors.state = `State must be between ${ADDRESS_LIMITS.STATE_MIN_LENGTH} and ${ADDRESS_LIMITS.STATE_MAX_LENGTH} characters.`;
      }
    }
  }

  // 10. country
  if (body.country !== undefined && body.country !== null) {
    if (typeof body.country !== 'string' || !body.country.trim()) {
      errors.country = 'Country cannot be empty.';
    } else if (body.country.trim().length > ADDRESS_LIMITS.COUNTRY_MAX_LENGTH) {
      errors.country = `Country cannot exceed ${ADDRESS_LIMITS.COUNTRY_MAX_LENGTH} characters.`;
    }
  }

  // 11. postalCode
  if (body.postalCode !== undefined) {
    if (typeof body.postalCode !== 'string' || !body.postalCode.trim()) {
      errors.postalCode = 'Postal code cannot be empty.';
    } else {
      const trimmed = body.postalCode.trim();
      if (!POSTAL_CODE_REGEX.test(trimmed)) {
        errors.postalCode = 'Invalid postal code format.';
      }
    }
  }

  // 12. latitude & longitude
  if (body.latitude !== undefined && body.latitude !== null && body.latitude !== '') {
    const lat = Number(body.latitude);
    if (isNaN(lat) || lat < ADDRESS_LIMITS.MIN_LATITUDE || lat > ADDRESS_LIMITS.MAX_LATITUDE) {
      errors.latitude = `Latitude must be a valid number between ${ADDRESS_LIMITS.MIN_LATITUDE} and ${ADDRESS_LIMITS.MAX_LATITUDE}.`;
    }
  }

  if (body.longitude !== undefined && body.longitude !== null && body.longitude !== '') {
    const lng = Number(body.longitude);
    if (isNaN(lng) || lng < ADDRESS_LIMITS.MIN_LONGITUDE || lng > ADDRESS_LIMITS.MAX_LONGITUDE) {
      errors.longitude = `Longitude must be a valid number between ${ADDRESS_LIMITS.MIN_LONGITUDE} and ${ADDRESS_LIMITS.MAX_LONGITUDE}.`;
    }
  }

  // 13. addressType
  if (body.addressType !== undefined && body.addressType !== null && body.addressType !== '') {
    if (typeof body.addressType !== 'string') {
      errors.addressType = 'Address type must be a string.';
    } else {
      const normalizedType = body.addressType.toUpperCase().trim();
      if (!Object.values(ADDRESS_TYPES).includes(normalizedType)) {
        errors.addressType = `Invalid address type. Allowed values: ${Object.values(ADDRESS_TYPES).join(', ')}.`;
      } else {
        req.body.addressType = normalizedType;
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

module.exports = {
  sanitizePhone,
  validateAddAddress,
  validateUpdateAddress,
};
