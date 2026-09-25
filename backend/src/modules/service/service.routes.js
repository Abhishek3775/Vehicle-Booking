const express = require('express');
const router = express.Router();
const serviceController = require('./service.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { authService } = require('../auth/auth.service');
const { ROLES } = require('../auth/auth.constants');
const {
  validateCreateService,
  validateUpdateService,
  validateUpdateStatus,
} = require('./service.validation');

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
      // Ignore invalid or expired token for public endpoints
    }
  }
  next();
};

/**
 * @route   POST /api/services
 * @desc    Create a new service catalogue entry
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  validateCreateService,
  (req, res) => serviceController.createService(req, res)
);

/**
 * @route   GET /api/services
 * @desc    Retrieve list of services (filtered, searched, paginated)
 * @access  Public / Authenticated
 */
router.get('/', optionalAuthenticate, (req, res) => serviceController.getServices(req, res));

/**
 * @route   GET /api/services/:serviceId
 * @desc    Retrieve service details by ID
 * @access  Public / Authenticated (inactive services hidden from non-admins)
 */
router.get('/:serviceId', optionalAuthenticate, (req, res) =>
  serviceController.getServiceById(req, res)
);

/**
 * @route   PUT /api/services/:serviceId
 * @desc    Update an existing service catalogue entry
 * @access  Private (Admin only)
 */
router.put(
  '/:serviceId',
  authenticate,
  authorize(ROLES.ADMIN),
  validateUpdateService,
  (req, res) => serviceController.updateService(req, res)
);

/**
 * @route   PATCH /api/services/:serviceId/status
 * @desc    Activate or deactivate service status
 * @access  Private (Admin only)
 */
router.patch(
  '/:serviceId/status',
  authenticate,
  authorize(ROLES.ADMIN),
  validateUpdateStatus,
  (req, res) => serviceController.updateServiceStatus(req, res)
);

/**
 * @route   DELETE /api/services/:serviceId
 * @desc    Soft-delete / deactivate a service
 * @access  Private (Admin only)
 */
router.delete(
  '/:serviceId',
  authenticate,
  authorize(ROLES.ADMIN),
  (req, res) => serviceController.deactivateService(req, res)
);

module.exports = router;
