const mongoose = require('mongoose');
const { INVOICE_LIMITS } = require('./invoice.constants');

const FORBIDDEN_GENERATE_FIELDS = [
  'amount',
  'totalAmount',
  'subtotal',
  'tax',
  'discount',
  'userId',
  'quotationId',
  'bookingId',
  'vehicleId',
  'invoiceNumber',
  'invoiceReference',
  'customerSnapshot',
  'vehicleSnapshot',
  'paymentSnapshot',
  'items',
  'paymentStatus',
  'invoiceStatus',
  'amountPaid',
  'amountDue',
  'issuedAt',
  'dueAt',
  'cancelledAt',
  'cancelledBy',
  'cancellationReason',
  '_id',
  'id',
  'createdAt',
  'updatedAt',
];

/**
 * Middleware: Validate invoiceId URL parameter
 */
const validateInvoiceIdParam = (req, res, next) => {
  const { invoiceId } = req.params;

  if (!invoiceId || !mongoose.Types.ObjectId.isValid(invoiceId)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: Invalid invoice ID format.',
      error: { fields: { invoiceId: 'Must be a valid 24-character hexadecimal MongoDB ObjectId.' } },
    });
  }

  next();
};

/**
 * Middleware: Validate bookingId URL parameter
 */
const validateBookingIdParam = (req, res, next) => {
  const { bookingId } = req.params;

  if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: Invalid booking ID format.',
      error: { fields: { bookingId: 'Must be a valid 24-character hexadecimal MongoDB ObjectId.' } },
    });
  }

  next();
};

/**
 * Middleware: Validate POST /api/invoices/generate payload
 */
const validateGenerateInvoice = (req, res, next) => {
  const errors = {};
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: Request body must be a valid JSON object.',
      error: { fields: { body: 'Invalid JSON body' } },
    });
  }

  // 1. Detect forbidden client-injected fields
  for (const field of FORBIDDEN_GENERATE_FIELDS) {
    if (field in body) {
      errors[field] = `Providing '${field}' in invoice generation payload is strictly prohibited. Derived server-side from payment and quotation.`;
    }
  }

  // 2. paymentId
  if (!body.paymentId || typeof body.paymentId !== 'string') {
    errors.paymentId = 'Payment ID is required.';
  } else if (!mongoose.Types.ObjectId.isValid(body.paymentId.trim())) {
    errors.paymentId = 'Payment ID must be a valid MongoDB ObjectId.';
  } else {
    req.body.paymentId = body.paymentId.trim();
  }

  // 3. notes
  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== 'string') {
      errors.notes = 'Notes must be a string.';
    } else if (body.notes.trim().length > INVOICE_LIMITS.NOTES_MAX_LENGTH) {
      errors.notes = `Notes cannot exceed ${INVOICE_LIMITS.NOTES_MAX_LENGTH} characters.`;
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
 * Middleware: Validate PATCH /api/invoices/:invoiceId/cancel payload
 */
const validateCancelInvoice = (req, res, next) => {
  const { cancellationReason } = req.body || {};

  if (!cancellationReason || typeof cancellationReason !== 'string' || !cancellationReason.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: { fields: { cancellationReason: 'Cancellation reason is required.' } },
    });
  }

  const trimmedReason = cancellationReason.trim();
  if (
    trimmedReason.length < INVOICE_LIMITS.REASON_MIN_LENGTH ||
    trimmedReason.length > INVOICE_LIMITS.REASON_MAX_LENGTH
  ) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        fields: {
          cancellationReason: `Cancellation reason must be between ${INVOICE_LIMITS.REASON_MIN_LENGTH} and ${INVOICE_LIMITS.REASON_MAX_LENGTH} characters.`,
        },
      },
    });
  }

  req.body.cancellationReason = trimmedReason;
  next();
};

module.exports = {
  validateInvoiceIdParam,
  validateBookingIdParam,
  validateGenerateInvoice,
  validateCancelInvoice,
};
