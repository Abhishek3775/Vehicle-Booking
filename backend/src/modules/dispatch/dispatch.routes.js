const express = require('express');
const router = express.Router();
const dispatchController = require('./dispatch.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { ROLES } = require('../auth/auth.constants');
const {
  validateManualAssign,
  validateRejectAssignment,
  validateCancelDispatch,
} = require('./dispatch.validation');

/**
 * @route   POST /api/dispatch/:bookingId
 * @desc    Initiate dispatch process for a booking
 * @access  Private (Admin only)
 */
router.post(
  '/:bookingId',
  authenticate,
  authorize(ROLES.ADMIN),
  (req, res) => dispatchController.createDispatch(req, res)
);

/**
 * @route   POST /api/dispatch/:bookingId/assign
 * @desc    Manually assign a mechanic to a booking
 * @access  Private (Admin only)
 */
router.post(
  '/:bookingId/assign',
  authenticate,
  authorize(ROLES.ADMIN),
  validateManualAssign,
  (req, res) => dispatchController.manualAssign(req, res)
);

/**
 * @route   POST /api/dispatch/:bookingId/auto-assign
 * @desc    Automatically select and assign the nearest suitable mechanic
 * @access  Private (Admin only)
 */
router.post(
  '/:bookingId/auto-assign',
  authenticate,
  authorize(ROLES.ADMIN),
  (req, res) => dispatchController.autoAssign(req, res)
);

/**
 * @route   PATCH /api/dispatch/:dispatchId/accept
 * @desc    Assigned mechanic accepts the dispatch
 * @access  Private (Mechanic only)
 */
router.patch(
  '/:dispatchId/accept',
  authenticate,
  authorize(ROLES.MECHANIC),
  (req, res) => dispatchController.acceptAssignment(req, res)
);

/**
 * @route   PATCH /api/dispatch/:dispatchId/reject
 * @desc    Assigned mechanic rejects the dispatch with reason
 * @access  Private (Mechanic only)
 */
router.patch(
  '/:dispatchId/reject',
  authenticate,
  authorize(ROLES.MECHANIC),
  validateRejectAssignment,
  (req, res) => dispatchController.rejectAssignment(req, res)
);

/**
 * @route   GET /api/dispatch/booking/:bookingId
 * @desc    Retrieve dispatch details associated with a booking
 * @access  Private (Customer owner, Assigned Mechanic, or Admin)
 */
router.get(
  '/booking/:bookingId',
  authenticate,
  (req, res) => dispatchController.getDispatchByBookingId(req, res)
);

/**
 * @route   GET /api/dispatch/:dispatchId
 * @desc    Retrieve single dispatch details by ID
 * @access  Private (Customer owner, Assigned Mechanic, or Admin)
 */
router.get(
  '/:dispatchId',
  authenticate,
  (req, res) => dispatchController.getDispatchById(req, res)
);

/**
 * @route   PATCH /api/dispatch/:dispatchId/cancel
 * @desc    Cancel an active dispatch process
 * @access  Private (Admin only)
 */
router.patch(
  '/:dispatchId/cancel',
  authenticate,
  authorize(ROLES.ADMIN),
  validateCancelDispatch,
  (req, res) => dispatchController.cancelDispatch(req, res)
);

module.exports = router;
