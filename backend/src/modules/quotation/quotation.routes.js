const express = require('express');
const router = express.Router();
const quotationController = require('./quotation.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const {
  validateBookingIdParam,
  validateQuotationIdParam,
  validateCreateQuotation,
  validateRejectQuotation,
} = require('./quotation.validation');

/**
 * @route   POST /api/quotations
 * @desc    Create a new quotation for a completed inspection
 * @access  Private (Assigned Mechanic or Admin)
 */
router.post(
  '/',
  authenticate,
  validateCreateQuotation,
  (req, res) => quotationController.createQuotation(req, res)
);

/**
 * @route   PATCH /api/quotations/:quotationId/submit
 * @desc    Submit quotation for customer approval
 * @access  Private (Assigned Mechanic or Admin)
 */
router.patch(
  '/:quotationId/submit',
  authenticate,
  validateQuotationIdParam,
  (req, res) => quotationController.submitQuotation(req, res)
);

/**
 * @route   PATCH /api/quotations/:quotationId/approve
 * @desc    Customer approves quotation
 * @access  Private (Customer only)
 */
router.patch(
  '/:quotationId/approve',
  authenticate,
  validateQuotationIdParam,
  (req, res) => quotationController.approveQuotation(req, res)
);

/**
 * @route   PATCH /api/quotations/:quotationId/reject
 * @desc    Customer rejects quotation with reason
 * @access  Private (Customer only)
 */
router.patch(
  '/:quotationId/reject',
  authenticate,
  validateQuotationIdParam,
  validateRejectQuotation,
  (req, res) => quotationController.rejectQuotation(req, res)
);

/**
 * @route   GET /api/quotations/booking/:bookingId
 * @desc    Retrieve all quotations associated with a booking
 * @access  Private (Customer Owner, Assigned Mechanic, or Admin)
 */
router.get(
  '/booking/:bookingId',
  authenticate,
  validateBookingIdParam,
  (req, res) => quotationController.getQuotationsByBookingId(req, res)
);

/**
 * @route   GET /api/quotations/:quotationId
 * @desc    Retrieve single quotation details by ID
 * @access  Private (Customer Owner, Assigned Mechanic, or Admin)
 */
router.get(
  '/:quotationId',
  authenticate,
  validateQuotationIdParam,
  (req, res) => quotationController.getQuotationById(req, res)
);

module.exports = router;
