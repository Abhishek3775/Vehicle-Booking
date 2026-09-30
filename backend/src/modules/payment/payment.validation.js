const mongoose = require('mongoose');
const { PAYMENT_METHODS } = require('./payment.constants');

const FORBIDDEN_CREATE_FIELDS = [
  'amount',
  'userId',
  'bookingId',
  'currency',
  'status',
  'paymentReference',
  'gatewayOrderId',
  'gatewayPaymentId',
  'gatewaySignature',
  'paidAt',
  'failedAt',
  'cancelledAt',
  'refundAmount',
  '_id',
  'id',
  'createdAt',
  'updatedAt',
];

/**
 * Middleware: Validate paymentId URL parameter
 */
const validatePaymentIdParam = (req, res, next) => {
  const { paymentId } = req.params;

  if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: Invalid payment ID format.',
      error: { fields: { paymentId: 'Must be a valid 24-character hexadecimal MongoDB ObjectId.' } },
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
 * Middleware: Validate quotationId URL parameter
 */
const validateQuotationIdParam = (req, res, next) => {
  const { quotationId } = req.params;

  if (!quotationId || !mongoose.Types.ObjectId.isValid(quotationId)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: Invalid quotation ID format.',
      error: { fields: { quotationId: 'Must be a valid 24-character hexadecimal MongoDB ObjectId.' } },
    });
  }

  next();
};

/**
 * Middleware: Validate POST /api/payments/create-order payload
 */
const validateCreateOrder = (req, res, next) => {
  const errors = {};
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: Request body must be a valid JSON object.',
      error: { fields: { body: 'Invalid JSON body' } },
    });
  }

  // 1. Detect forbidden client-provided fields
  for (const field of FORBIDDEN_CREATE_FIELDS) {
    if (field in body) {
      errors[field] = `Providing '${field}' in payment create payload is strictly prohibited. Derived server-side from approved quotation.`;
    }
  }

  // 2. quotationId
  if (!body.quotationId || typeof body.quotationId !== 'string') {
    errors.quotationId = 'Quotation ID is required.';
  } else if (!mongoose.Types.ObjectId.isValid(body.quotationId.trim())) {
    errors.quotationId = 'Quotation ID must be a valid MongoDB ObjectId.';
  } else {
    req.body.quotationId = body.quotationId.trim();
  }

  // 3. paymentMethod
  if (body.paymentMethod !== undefined && body.paymentMethod !== null) {
    const normMethod = String(body.paymentMethod).toUpperCase().trim();
    if (!Object.values(PAYMENT_METHODS).includes(normMethod)) {
      errors.paymentMethod = `Invalid payment method '${body.paymentMethod}'. Allowed: ${Object.values(
        PAYMENT_METHODS
      ).join(', ')}.`;
    } else {
      req.body.paymentMethod = normMethod;
    }
  } else {
    req.body.paymentMethod = PAYMENT_METHODS.RAZORPAY;
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
 * Middleware: Validate POST /api/payments/verify payload
 */
const validateVerifyPayment = (req, res, next) => {
  const errors = {};
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: Request body must be a valid JSON object.',
      error: { fields: { body: 'Invalid JSON body' } },
    });
  }

  const orderId = body.razorpay_order_id || body.gatewayOrderId;
  const paymentId = body.razorpay_payment_id || body.gatewayPaymentId;
  const signature = body.razorpay_signature || body.gatewaySignature;

  if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
    errors.razorpay_order_id = 'Gateway Order ID (razorpay_order_id) is required.';
  } else {
    req.body.razorpay_order_id = orderId.trim();
    req.body.gatewayOrderId = orderId.trim();
  }

  if (!paymentId || typeof paymentId !== 'string' || !paymentId.trim()) {
    errors.razorpay_payment_id = 'Gateway Payment ID (razorpay_payment_id) is required.';
  } else {
    req.body.razorpay_payment_id = paymentId.trim();
    req.body.gatewayPaymentId = paymentId.trim();
  }

  if (!signature || typeof signature !== 'string' || !signature.trim()) {
    errors.razorpay_signature = 'Gateway Signature (razorpay_signature) is required.';
  } else {
    req.body.razorpay_signature = signature.trim();
    req.body.gatewaySignature = signature.trim();
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
  validatePaymentIdParam,
  validateBookingIdParam,
  validateQuotationIdParam,
  validateCreateOrder,
  validateVerifyPayment,
};
