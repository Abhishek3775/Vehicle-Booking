const express = require('express');
const router = express.Router();
const mechanicController = require('./mechanic.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { ROLES } = require('../auth/auth.constants');
const {
  validateMechanicIdParam,
  validateCreateMechanic,
  validateUpdateMechanic,
  validateUpdateAvailability,
  validateUpdateWorkStatus,
  validateUpdateLocation,
  validateUpdateVerification,
} = require('./mechanic.validation');

/**
 * @route   POST /api/mechanics
 * @desc    Create a new mechanic profile for a registered MECHANIC user
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  validateCreateMechanic,
  (req, res) => mechanicController.createMechanic(req, res)
);

/**
 * @route   GET /api/mechanics/me
 * @desc    Retrieve authenticated mechanic's own profile
 * @access  Private (Mechanic only)
 */
router.get(
  '/me',
  authenticate,
  authorize(ROLES.MECHANIC),
  (req, res) => mechanicController.getMyProfile(req, res)
);

/**
 * @route   GET /api/mechanics
 * @desc    List and search mechanics with filtering and pagination
 * @access  Private (Admin only)
 */
router.get(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  (req, res) => mechanicController.getMechanicsList(req, res)
);

/**
 * @route   GET /api/mechanics/:mechanicId
 * @desc    Retrieve single mechanic profile by ID
 * @access  Private (Authenticated users)
 */
router.get(
  '/:mechanicId',
  authenticate,
  validateMechanicIdParam,
  (req, res) => mechanicController.getMechanicById(req, res)
);

/**
 * @route   PUT /api/mechanics/:mechanicId
 * @desc    Update mechanic profile (Allowed fields)
 * @access  Private (Owner Mechanic or Admin)
 */
router.put(
  '/:mechanicId',
  authenticate,
  validateMechanicIdParam,
  validateUpdateMechanic,
  (req, res) => mechanicController.updateMechanic(req, res)
);

/**
 * @route   PATCH /api/mechanics/:mechanicId/availability
 * @desc    Update mechanic availability status
 * @access  Private (Owner Mechanic or Admin)
 */
router.patch(
  '/:mechanicId/availability',
  authenticate,
  validateMechanicIdParam,
  validateUpdateAvailability,
  (req, res) => mechanicController.updateAvailability(req, res)
);

/**
 * @route   PATCH /api/mechanics/:mechanicId/work-status
 * @desc    Update mechanic work status
 * @access  Private (Owner Mechanic or Admin)
 */
router.patch(
  '/:mechanicId/work-status',
  authenticate,
  validateMechanicIdParam,
  validateUpdateWorkStatus,
  (req, res) => mechanicController.updateWorkStatus(req, res)
);

/**
 * @route   PATCH /api/mechanics/:mechanicId/location
 * @desc    Update mechanic current geographic coordinates
 * @access  Private (Owner Mechanic or Admin)
 */
router.patch(
  '/:mechanicId/location',
  authenticate,
  validateMechanicIdParam,
  validateUpdateLocation,
  (req, res) => mechanicController.updateLocation(req, res)
);

/**
 * @route   PATCH /api/mechanics/:mechanicId/verification
 * @desc    Update mechanic verification status
 * @access  Private (Admin only)
 */
router.patch(
  '/:mechanicId/verification',
  authenticate,
  authorize(ROLES.ADMIN),
  validateMechanicIdParam,
  validateUpdateVerification,
  (req, res) => mechanicController.updateVerification(req, res)
);

module.exports = router;
