const express = require('express');
const paymentController = require('./payment.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { ROLES } = require('../auth/auth.constants');
const {
  validateCreateOrder,
  validateVerifyPayment,
  validatePaymentIdParam,
  validateBookingIdParam,
  validateQuotationIdParam,
} = require('./payment.validation');

const router = express.Router();

/**
 * @route   POST /api/payments/create-order
 * @desc    Create a payment order for an approved quotation
 * @access  Private (Customer, Admin)
 */
router.post(
  '/create-order',
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.ADMIN),
  validateCreateOrder,
  paymentController.createOrder
);

/**
 * @route   POST /api/payments/verify
 * @desc    Cryptographically verify gateway payment signature and settle payment
 * @access  Private (Customer, Admin)
 */
router.post(
  '/verify',
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.ADMIN),
  validateVerifyPayment,
  paymentController.verifyPayment
);

/**
 * @route   POST /api/payments/webhook/razorpay
 * @desc    Receive asynchronous payment lifecycle events from Razorpay
 * @access  Public (Signature validated)
 */
router.post(
  '/webhook/razorpay',
  paymentController.handleRazorpayWebhook
);

/**
 * @route   GET /api/payments/:paymentId
 * @desc    Fetch payment details by ID
 * @access  Private (Customer Owner, Admin)
 */
router.get(
  '/:paymentId',
  authenticate,
  validatePaymentIdParam,
  paymentController.getPaymentById
);

/**
 * @route   GET /api/payments/booking/:bookingId
 * @desc    Fetch payment history for a specific booking
 * @access  Private (Customer Owner, Admin)
 */
router.get(
  '/booking/:bookingId',
  authenticate,
  validateBookingIdParam,
  paymentController.getPaymentsByBookingId
);

/**
 * @route   GET /api/payments/quotation/:quotationId
 * @desc    Fetch payment history for a specific quotation
 * @access  Private (Customer Owner, Admin)
 */
router.get(
  '/quotation/:quotationId',
  authenticate,
  validateQuotationIdParam,
  paymentController.getPaymentsByQuotationId
);

module.exports = router;
