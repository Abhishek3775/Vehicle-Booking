const mongoose = require('mongoose');
const {
  DEVICE_PLATFORMS,
  NOTIFICATION_CATEGORIES,
  PAGINATION_LIMITS,
} = require('./notification.constants');

const FORBIDDEN_REGISTER_FIELDS = ['userId', 'isActive', 'lastUsedAt', '_id', 'id', 'createdAt', 'updatedAt'];

/**
 * Middleware: Validate notificationId URL parameter
 */
const validateNotificationIdParam = (req, res, next) => {
  const { notificationId } = req.params;

  if (!notificationId || !mongoose.Types.ObjectId.isValid(notificationId)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: Invalid notification ID format.',
      error: { fields: { notificationId: 'Must be a valid 24-character hexadecimal MongoDB ObjectId.' } },
    });
  }

  next();
};

/**
 * Middleware: Validate deviceId URL parameter
 */
const validateDeviceIdParam = (req, res, next) => {
  const { deviceId } = req.params;

  if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: Device ID is required.',
      error: { fields: { deviceId: 'Must be a non-empty string.' } },
    });
  }

  req.params.deviceId = deviceId.trim();
  next();
};

/**
 * Middleware: Validate POST /api/notifications/devices payload
 */
const validateRegisterDevice = (req, res, next) => {
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
  for (const field of FORBIDDEN_REGISTER_FIELDS) {
    if (field in body) {
      errors[field] = `Providing '${field}' in device registration payload is forbidden. Derived from authentication context.`;
    }
  }

  // 2. token
  if (!body.token || typeof body.token !== 'string' || !body.token.trim()) {
    errors.token = 'Device push token is required.';
  } else {
    req.body.token = body.token.trim();
  }

  // 3. platform
  if (!body.platform || typeof body.platform !== 'string') {
    errors.platform = `Platform is required. Allowed: ${Object.values(DEVICE_PLATFORMS).join(', ')}.`;
  } else {
    const normPlatform = body.platform.toUpperCase().trim();
    if (!Object.values(DEVICE_PLATFORMS).includes(normPlatform)) {
      errors.platform = `Invalid platform '${body.platform}'. Allowed: ${Object.values(DEVICE_PLATFORMS).join(', ')}.`;
    } else {
      req.body.platform = normPlatform;
    }
  }

  // 4. deviceId
  if (!body.deviceId || typeof body.deviceId !== 'string' || !body.deviceId.trim()) {
    errors.deviceId = 'Device ID is required.';
  } else {
    req.body.deviceId = body.deviceId.trim();
  }

  // 5. appVersion (optional)
  if (body.appVersion !== undefined && body.appVersion !== null) {
    if (typeof body.appVersion !== 'string') {
      errors.appVersion = 'App version must be a string.';
    } else {
      req.body.appVersion = body.appVersion.trim();
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
 * Middleware: Validate GET /api/notifications query parameters
 */
const validateGetNotificationsQuery = (req, res, next) => {
  const { page, limit, isRead, category } = req.query;

  if (page !== undefined) {
    const p = parseInt(page, 10);
    if (isNaN(p) || p < 1) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: { fields: { page: 'Page must be a positive integer greater than or equal to 1.' } },
      });
    }
  }

  if (limit !== undefined) {
    const l = parseInt(limit, 10);
    if (isNaN(l) || l < 1 || l > PAGINATION_LIMITS.MAX_LIMIT) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: { fields: { limit: `Limit must be an integer between 1 and ${PAGINATION_LIMITS.MAX_LIMIT}.` } },
      });
    }
  }

  if (isRead !== undefined) {
    const norm = String(isRead).toLowerCase().trim();
    if (norm !== 'true' && norm !== 'false') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: { fields: { isRead: 'isRead must be a boolean (true or false).' } },
      });
    }
  }

  if (category !== undefined) {
    const normCat = String(category).toUpperCase().trim();
    if (!Object.values(NOTIFICATION_CATEGORIES).includes(normCat)) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: { fields: { category: `Invalid category. Allowed: ${Object.values(NOTIFICATION_CATEGORIES).join(', ')}.` } },
      });
    }
  }

  next();
};

module.exports = {
  validateNotificationIdParam,
  validateDeviceIdParam,
  validateRegisterDevice,
  validateGetNotificationsQuery,
};
