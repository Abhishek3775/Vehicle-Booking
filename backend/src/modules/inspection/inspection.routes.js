const express = require('express');
const router = express.Router();
const inspectionController = require('./inspection.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const {
  validateBookingIdParam,
  validateInspectionIdParam,
  validateUpdateInspection,
} = require('./inspection.validation');

/**
 * @route   POST /api/inspections/:bookingId/start
 * @desc    Start a vehicle inspection for an assigned booking
 * @access  Private (Assigned Mechanic or Admin)
 */
router.post(
  '/:bookingId/start',
  authenticate,
  validateBookingIdParam,
  (req, res) => inspectionController.startInspection(req, res)
);

/**
 * @route   GET /api/inspections/booking/:bookingId
 * @desc    Retrieve the latest inspection for a booking
 * @access  Private (Customer Owner, Assigned Mechanic, or Admin)
 */
router.get(
  '/booking/:bookingId',
  authenticate,
  validateBookingIdParam,
  (req, res) => inspectionController.getInspectionByBookingId(req, res)
);

/**
 * @route   PUT /api/inspections/:inspectionId
 * @desc    Update active inspection checklist, findings, recommendations
 * @access  Private (Assigned Mechanic or Admin)
 */
router.put(
  '/:inspectionId',
  authenticate,
  validateInspectionIdParam,
  validateUpdateInspection,
  (req, res) => inspectionController.updateInspection(req, res)
);

/**
 * @route   PATCH /api/inspections/:inspectionId/complete
 * @desc    Mark vehicle inspection as COMPLETED
 * @access  Private (Assigned Mechanic or Admin)
 */
router.patch(
  '/:inspectionId/complete',
  authenticate,
  validateInspectionIdParam,
  (req, res) => inspectionController.completeInspection(req, res)
);

/**
 * @route   PATCH /api/inspections/:inspectionId/acknowledge
 * @desc    Customer acknowledges viewing completed inspection findings
 * @access  Private (Customer Owner or Admin)
 */
router.patch(
  '/:inspectionId/acknowledge',
  authenticate,
  validateInspectionIdParam,
  (req, res) => inspectionController.acknowledgeInspection(req, res)
);

/**
 * @route   GET /api/inspections/:inspectionId
 * @desc    Retrieve single inspection details by ID
 * @access  Private (Customer Owner, Assigned Mechanic, or Admin)
 */
router.get(
  '/:inspectionId',
  authenticate,
  validateInspectionIdParam,
  (req, res) => inspectionController.getInspectionById(req, res)
);

module.exports = router;
