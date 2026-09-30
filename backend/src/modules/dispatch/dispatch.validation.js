const mongoose = require('mongoose');
const { DISPATCH_LIMITS } = require('./dispatch.constants');

/**
 * Middleware: Validate POST /api/dispatch/:bookingId/assign payload
 */
const validateManualAssign = (req, res, next) => {
  const errors = {};
  const { mechanicId, notes } = req.body || {};

  // 1. mechanicId
  if (!mechanicId || typeof mechanicId !== 'string' || !mechanicId.trim()) {
    errors.mechanicId = 'Mechanic ID is required.';
  } else if (!mongoose.Types.ObjectId.isValid(mechanicId.trim())) {
    errors.mechanicId = 'Mechanic ID must be a valid MongoDB ObjectId.';
  } else {
    req.body.mechanicId = mechanicId.trim();
  }

  // 2. notes
  if (notes !== undefined && notes !== null) {
    if (typeof notes !== 'string') {
      errors.notes = 'Notes must be a string.';
    } else if (notes.trim().length > 1000) {
      errors.notes = 'Notes cannot exceed 1000 characters.';
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

/**
 * Middleware: Validate PATCH /api/dispatch/:dispatchId/reject payload
 */
const validateRejectAssignment = (req, res, next) => {
  const { rejectionReason } = req.body || {};

  if (!rejectionReason || typeof rejectionReason !== 'string' || !rejectionReason.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: { fields: { rejectionReason: 'Rejection reason is required.' } },
    });
  }

  const trimmed = rejectionReason.trim();
  if (
    trimmed.length < DISPATCH_LIMITS.REJECTION_REASON_MIN_LENGTH ||
    trimmed.length > DISPATCH_LIMITS.REJECTION_REASON_MAX_LENGTH
  ) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        fields: {
          rejectionReason: `Rejection reason must be between ${DISPATCH_LIMITS.REJECTION_REASON_MIN_LENGTH} and ${DISPATCH_LIMITS.REJECTION_REASON_MAX_LENGTH} characters.`,
        },
      },
    });
  }

  req.body.rejectionReason = trimmed;
  next();
};

/**
 * Middleware: Validate PATCH /api/dispatch/:dispatchId/cancel payload
 */
const validateCancelDispatch = (req, res, next) => {
  const { cancellationReason } = req.body || {};

  if (cancellationReason !== undefined && cancellationReason !== null) {
    if (typeof cancellationReason !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: { fields: { cancellationReason: 'Cancellation reason must be a string.' } },
      });
    }

    if (cancellationReason.trim().length > DISPATCH_LIMITS.CANCELLATION_REASON_MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: {
          fields: {
            cancellationReason: `Cancellation reason cannot exceed ${DISPATCH_LIMITS.CANCELLATION_REASON_MAX_LENGTH} characters.`,
          },
        },
      });
    }

    req.body.cancellationReason = cancellationReason.trim();
  }

  next();
};

module.exports = {
  validateManualAssign,
  validateRejectAssignment,
  validateCancelDispatch,
};
