const express = require('express');
const invoiceController = require('./invoice.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { ROLES } = require('../auth/auth.constants');
const {
  validateGenerateInvoice,
  validateCancelInvoice,
  validateInvoiceIdParam,
  validateBookingIdParam,
} = require('./invoice.validation');

const router = express.Router();

/**
 * @route   POST /api/invoices/generate
 * @desc    Generate permanent billing invoice from successful payment
 * @access  Private (Customer, Admin)
 */
router.post(
  '/generate',
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.ADMIN),
  validateGenerateInvoice,
  invoiceController.generateInvoice
);

/**
 * @route   GET /api/invoices
 * @desc    Fetch invoice billing list (Customer scoped to own, Admin can filter all)
 * @access  Private (Customer, Admin)
 */
router.get(
  '/',
  authenticate,
  invoiceController.getInvoicesList
);

/**
 * @route   GET /api/invoices/:invoiceId
 * @desc    Fetch single invoice details by ID
 * @access  Private (Customer Owner, Admin)
 */
router.get(
  '/:invoiceId',
  authenticate,
  validateInvoiceIdParam,
  invoiceController.getInvoiceById
);

/**
 * @route   GET /api/invoices/booking/:bookingId
 * @desc    Fetch invoice history for a specific booking
 * @access  Private (Customer Owner, Admin)
 */
router.get(
  '/booking/:bookingId',
  authenticate,
  validateBookingIdParam,
  invoiceController.getInvoicesByBookingId
);

/**
 * @route   PATCH /api/invoices/:invoiceId/cancel
 * @desc    Cancel an issued invoice
 * @access  Private (Admin only)
 */
router.patch(
  '/:invoiceId/cancel',
  authenticate,
  authorize(ROLES.ADMIN),
  validateInvoiceIdParam,
  validateCancelInvoice,
  invoiceController.cancelInvoice
);

module.exports = router;
