const express = require('express');
const router = express.Router();
const servicePackageController = require('./servicePackage.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { authService } = require('../auth/auth.service');
const { ROLES } = require('../auth/auth.constants');
const {
  validateCreatePackage,
  validateUpdatePackage,
  validateUpdatePackageStatus,
} = require('./servicePackage.validation');

/**
 * Middleware: Extract authenticated user context if Bearer token is present,
 * without blocking unauthenticated requests to public endpoints.
 */
const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = authService.verifyAccessToken(token);
      req.user = decoded;
    } catch {
      // Ignore invalid or expired token for public catalogue endpoints
    }
  }
  next();
};

/**
 * @route   POST /api/service-packages
 * @desc    Create a new service package
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  validateCreatePackage,
  (req, res) => servicePackageController.createPackage(req, res)
);

/**
 * @route   GET /api/service-packages
 * @desc    Retrieve list of service packages (filtered, searched, paginated)
 * @access  Public / Authenticated
 */
router.get('/', optionalAuthenticate, (req, res) =>
  servicePackageController.getPackages(req, res)
);

/**
 * @route   GET /api/service-packages/:packageId
 * @desc    Retrieve service package details by ID
 * @access  Public / Authenticated (inactive packages hidden from non-admins)
 */
router.get('/:packageId', optionalAuthenticate, (req, res) =>
  servicePackageController.getPackageById(req, res)
);

/**
 * @route   PUT /api/service-packages/:packageId
 * @desc    Update an existing service package
 * @access  Private (Admin only)
 */
router.put(
  '/:packageId',
  authenticate,
  authorize(ROLES.ADMIN),
  validateUpdatePackage,
  (req, res) => servicePackageController.updatePackage(req, res)
);

/**
 * @route   PATCH /api/service-packages/:packageId/status
 * @desc    Activate or deactivate service package status
 * @access  Private (Admin only)
 */
router.patch(
  '/:packageId/status',
  authenticate,
  authorize(ROLES.ADMIN),
  validateUpdatePackageStatus,
  (req, res) => servicePackageController.updatePackageStatus(req, res)
);

/**
 * @route   DELETE /api/service-packages/:packageId
 * @desc    Soft-delete / deactivate a service package
 * @access  Private (Admin only)
 */
router.delete(
  '/:packageId',
  authenticate,
  authorize(ROLES.ADMIN),
  (req, res) => servicePackageController.deactivatePackage(req, res)
);

module.exports = router;
