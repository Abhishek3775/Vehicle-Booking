const mongoose = require('mongoose');
const { AUDIT_ACTIONS, AUDIT_MODULES, PAGINATION_LIMITS } = require('./admin.constants');
const { ACCOUNT_STATUS } = require('../auth/auth.constants');
const { VERIFICATION_STATUS } = require('../mechanic/mechanic.constants');

const FORBIDDEN_PROFILE_FIELDS = ['userId', 'adminCode', 'password', 'role', '_id', 'id', 'createdAt', 'updatedAt'];

/**
 * Middleware generator: Validate MongoDB ObjectId in req.params
 * @param {string} paramName
 */
const validateIdParam = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Validation failed: Invalid ${paramName} format.`,
        error: { fields: { [paramName]: 'Must be a valid 24-character hexadecimal MongoDB ObjectId.' } },
      });
    }
    next();
  };
};

/**
 * Middleware: Validate PUT /api/admin/profile payload
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

  // Detect forbidden fields
  for (const field of FORBIDDEN_PROFILE_FIELDS) {
    if (field in body) {
      errors[field] = `Modifying '${field}' via profile update is forbidden.`;
    }
  }

  if (body.displayName !== undefined && body.displayName !== null) {
    if (typeof body.displayName !== 'string') {
      errors.displayName = 'Display name must be a string.';
    } else {
      req.body.displayName = body.displayName.trim();
    }
  }

  if (body.department !== undefined && body.department !== null) {
    if (typeof body.department !== 'string') {
      errors.department = 'Department must be a string.';
    } else {
      req.body.department = body.department.trim();
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
 * Middleware: Validate PATCH /api/admin/users/:userId/status payload
 */
const validateUpdateUserStatus = (req, res, next) => {
  const { status, accountStatus, reason } = req.body || {};
  const targetStatus = (status || accountStatus || '').toUpperCase().trim();

  if (!targetStatus || !Object.values(ACCOUNT_STATUS).includes(targetStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        fields: {
          status: `Invalid account status. Allowed: ${Object.values(ACCOUNT_STATUS).join(', ')}.`,
        },
      },
    });
  }

  req.body.status = targetStatus;
  req.body.reason = reason ? String(reason).trim() : 'Updated by Administrator';
  next();
};

/**
 * Middleware: Validate PATCH /api/admin/mechanics/:mechanicId/verification payload
 */
const validateUpdateMechanicVerification = (req, res, next) => {
  const { verificationStatus, reason } = req.body || {};
  const normStatus = (verificationStatus || '').toUpperCase().trim();

  if (!normStatus || !Object.values(VERIFICATION_STATUS).includes(normStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        fields: {
          verificationStatus: `Invalid verification status. Allowed: ${Object.values(VERIFICATION_STATUS).join(', ')}.`,
        },
      },
    });
  }

  req.body.verificationStatus = normStatus;
  req.body.reason = reason ? String(reason).trim() : 'Verification updated by Administrator';
  next();
};

/**
 * Middleware: Validate PATCH /api/admin/bookings/:bookingId/cancel payload
 */
const validateCancelBooking = (req, res, next) => {
  const { cancellationReason, reason } = req.body || {};
  const cancelReason = (cancellationReason || reason || '').trim();

  if (!cancelReason || cancelReason.length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        fields: {
          cancellationReason: 'Cancellation reason is required (minimum 3 characters).',
        },
      },
    });
  }

  req.body.cancellationReason = cancelReason;
  next();
};

/**
 * Middleware: Validate query pagination parameters
 */
const validatePaginationQuery = (req, res, next) => {
  const { page, limit } = req.query;

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

  next();
};

/**
 * Middleware: Validate date range queries for dashboard and audit logs
 */
const validateDashboardFilter = (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (startDate) {
    const d = new Date(startDate);
    if (isNaN(d.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: { fields: { startDate: 'startDate must be a valid ISO Date string.' } },
      });
    }
  }

  if (endDate) {
    const d = new Date(endDate);
    if (isNaN(d.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: { fields: { endDate: 'endDate must be a valid ISO Date string.' } },
      });
    }
  }

  next();
};

/**
 * Middleware: Validate audit logs query filters
 */
const validateAuditLogQuery = (req, res, next) => {
  const { module: targetModule, action } = req.query;

  if (targetModule) {
    const norm = String(targetModule).toUpperCase().trim();
    if (!Object.values(AUDIT_MODULES).includes(norm)) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: { fields: { module: `Invalid module. Allowed: ${Object.values(AUDIT_MODULES).join(', ')}.` } },
      });
    }
  }

  if (action) {
    const normAction = String(action).toUpperCase().trim();
    if (!Object.values(AUDIT_ACTIONS).includes(normAction)) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: { fields: { action: `Invalid action. Allowed: ${Object.values(AUDIT_ACTIONS).join(', ')}.` } },
      });
    }
  }

  next();
};

module.exports = {
  validateIdParam,
  validateUpdateProfile,
  validateUpdateUserStatus,
  validateUpdateMechanicVerification,
  validateCancelBooking,
  validatePaginationQuery,
  validateDashboardFilter,
  validateAuditLogQuery,
};
