const { GENDERS, PROFILE_LIMITS } = require('./user.constants');

// Standard RFC-compliant email regular expression
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Standard image URL/URI pattern (supports http, https, and data URI formats)
const IMAGE_URL_REGEX = /^(https?:\/\/[^\s$.?#].[^\s]*|data:image\/(?:png|jpeg|jpg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+|\/[^\s]+)$/i;

// Forbidden fields that cannot be altered via user profile update endpoint
const FORBIDDEN_FIELDS = [
  'role',
  'accountStatus',
  'password',
  'passwordHash',
  'otp',
  'otpHash',
  'refreshToken',
  'userId',
  'authId',
  '_id',
  'id',
  'createdAt',
  'updatedAt',
  'isPhoneVerified',
  'deactivatedAt',
  'lastLoginAt',
];

/**
 * Middleware: Validate PUT /api/users/profile payload
 */
const validateUpdateProfile = (req, res, next) => {
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
      errors[field] = `Updating '${field}' is strictly prohibited.`;
    }
  }

  // 2. Validate firstName
  if (body.firstName !== undefined && body.firstName !== null) {
    if (typeof body.firstName !== 'string') {
      errors.firstName = 'First name must be a string.';
    } else {
      const trimmed = body.firstName.trim();
      if (trimmed.length > PROFILE_LIMITS.NAME_MAX_LENGTH) {
        errors.firstName = `First name cannot exceed ${PROFILE_LIMITS.NAME_MAX_LENGTH} characters.`;
      }
    }
  }

  // 3. Validate lastName
  if (body.lastName !== undefined && body.lastName !== null) {
    if (typeof body.lastName !== 'string') {
      errors.lastName = 'Last name must be a string.';
    } else {
      const trimmed = body.lastName.trim();
      if (trimmed.length > PROFILE_LIMITS.NAME_MAX_LENGTH) {
        errors.lastName = `Last name cannot exceed ${PROFILE_LIMITS.NAME_MAX_LENGTH} characters.`;
      }
    }
  }

  // 4. Validate email
  if (body.email !== undefined && body.email !== null && body.email !== '') {
    if (typeof body.email !== 'string') {
      errors.email = 'Email must be a string.';
    } else {
      const trimmedEmail = body.email.trim();
      if (trimmedEmail.length > 254) {
        errors.email = 'Email address cannot exceed 254 characters.';
      } else if (!EMAIL_REGEX.test(trimmedEmail)) {
        errors.email = 'Invalid email address format.';
      }
    }
  }

  // 5. Validate gender
  if (body.gender !== undefined && body.gender !== null && body.gender !== '') {
    if (typeof body.gender !== 'string') {
      errors.gender = 'Gender must be a string.';
    } else {
      const normalizedGender = body.gender.toLowerCase().trim();
      if (!Object.values(GENDERS).includes(normalizedGender)) {
        errors.gender = `Invalid gender value. Allowed values: ${Object.values(GENDERS).join(', ')}.`;
      }
    }
  }

  // 6. Validate dateOfBirth
  if (body.dateOfBirth !== undefined && body.dateOfBirth !== null && body.dateOfBirth !== '') {
    const dob = new Date(body.dateOfBirth);
    if (isNaN(dob.getTime())) {
      errors.dateOfBirth = 'Invalid date format. Use YYYY-MM-DD or ISO 8601 string.';
    } else {
      const now = new Date();
      if (dob > now) {
        errors.dateOfBirth = 'Date of birth cannot be in the future.';
      } else {
        const earliestAllowed = new Date();
        earliestAllowed.setFullYear(earliestAllowed.getFullYear() - PROFILE_LIMITS.MAX_AGE_YEARS);
        if (dob < earliestAllowed) {
          errors.dateOfBirth = `Date of birth cannot be older than ${PROFILE_LIMITS.MAX_AGE_YEARS} years ago.`;
        }
      }
    }
  }

  // 7. Validate preferences
  if (body.preferences !== undefined && body.preferences !== null) {
    if (typeof body.preferences !== 'object' || Array.isArray(body.preferences)) {
      errors.preferences = 'Preferences must be a valid key-value object.';
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
 * Middleware: Validate PUT /api/users/profile-image payload
 */
const validateUpdateProfileImage = (req, res, next) => {
  const errors = {};
  const image = req.body?.profileImage || req.body?.imageUrl;

  if (!image || typeof image !== 'string' || !image.trim()) {
    errors.profileImage = 'profileImage is required and must be a non-empty string.';
  } else {
    const trimmed = image.trim();
    if (trimmed.length > PROFILE_LIMITS.IMAGE_URL_MAX_LENGTH) {
      errors.profileImage = `Image URL cannot exceed ${PROFILE_LIMITS.IMAGE_URL_MAX_LENGTH} characters.`;
    } else if (!IMAGE_URL_REGEX.test(trimmed)) {
      errors.profileImage = 'Invalid image URL or base64 format.';
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: { fields: errors },
    });
  }

  // Normalize field
  req.body.profileImage = image.trim();
  next();
};

module.exports = {
  validateUpdateProfile,
  validateUpdateProfileImage,
};
