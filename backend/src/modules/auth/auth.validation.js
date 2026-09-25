/**
 * Authentication Input Validation
 *
 * Provides request validation middlewares for all Auth endpoints.
 * Returns consistent 400 Bad Request responses when input does not conform.
 */

// Phone number regex: accepts standard numbers with 10 to 15 digits (e.g. 9876543210 or +919876543210)
const PHONE_REGEX = /^\+?[1-9]\d{9,14}$/;
// 6-digit OTP regex
const OTP_REGEX = /^\d{6}$/;

/**
 * Normalizes phone numbers by stripping whitespace and dashes
 * @param {string} phone
 * @returns {string}
 */
const sanitizePhone = (phone) => {
  if (typeof phone !== 'string') return '';
  return phone.replace(/[\s-]/g, '').trim();
};

/**
 * Middleware: Validate request OTP payload
 */
const validateRequestOtp = (req, res, next) => {
  const errors = {};
  let { phone } = req.body || {};

  if (!phone || typeof phone !== 'string') {
    errors.phone = 'Phone number is required';
  } else {
    phone = sanitizePhone(phone);
    if (!PHONE_REGEX.test(phone)) {
      errors.phone = 'Invalid phone number format. Must contain 10 to 15 digits.';
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: { fields: errors },
    });
  }

  // Pass sanitized phone downstream
  req.body.phone = phone;
  next();
};

/**
 * Middleware: Validate verify OTP payload
 */
const validateVerifyOtp = (req, res, next) => {
  const errors = {};
  let { phone, otp } = req.body || {};

  if (!phone || typeof phone !== 'string') {
    errors.phone = 'Phone number is required';
  } else {
    phone = sanitizePhone(phone);
    if (!PHONE_REGEX.test(phone)) {
      errors.phone = 'Invalid phone number format. Must contain 10 to 15 digits.';
    }
  }

  if (!otp || typeof otp !== 'string') {
    errors.otp = 'OTP is required and must be a 6-digit string';
  } else {
    const trimmedOtp = otp.trim();
    if (!OTP_REGEX.test(trimmedOtp)) {
      errors.otp = 'OTP must be exactly 6 digits';
    } else {
      req.body.otp = trimmedOtp;
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: { fields: errors },
    });
  }

  req.body.phone = phone;
  next();
};

/**
 * Middleware: Validate refresh token payload
 */
const validateRefreshToken = (req, res, next) => {
  const { refreshToken } = req.body || {};

  if (!refreshToken || typeof refreshToken !== 'string' || !refreshToken.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        fields: {
          refreshToken: 'Refresh token is required',
        },
      },
    });
  }

  req.body.refreshToken = refreshToken.trim();
  next();
};

/**
 * Middleware: Validate logout payload
 * Supports receiving refreshToken in body or Authorization header
 */
const validateLogout = (req, res, next) => {
  const { refreshToken } = req.body || {};
  const authHeader = req.headers.authorization;

  if ((!refreshToken || typeof refreshToken !== 'string') && !authHeader) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        fields: {
          refreshToken: 'Either refreshToken in request body or Bearer token in Authorization header is required for logout',
        },
      },
    });
  }

  if (refreshToken && typeof refreshToken === 'string') {
    req.body.refreshToken = refreshToken.trim();
  }

  next();
};

module.exports = {
  sanitizePhone,
  validateRequestOtp,
  validateVerifyOtp,
  validateRefreshToken,
  validateLogout,
};
