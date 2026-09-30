const express = require('express');
const router = express.Router();
const partsController = require('./parts.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { authService } = require('../auth/auth.service');
const { ROLES } = require('../auth/auth.constants');
const {
  validateCreatePart,
  validateUpdatePart,
  validateUpdateStatus,
  validateStockAdjustment,
  validateStockReservation,
  validateStockRelease,
} = require('./parts.validation');

/**
 * Middleware: Extract authenticated user context if Bearer token is present,
 * without blocking unauthenticated requests to public catalogue endpoints.
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
 * @route   POST /api/parts
 * @desc    Create a new part catalogue entry
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  validateCreatePart,
  (req, res) => partsController.createPart(req, res)
);

/**
 * @route   GET /api/parts
 * @desc    Retrieve list of parts (filtered, searched, paginated)
 * @access  Public / Authenticated
 */
router.get('/', optionalAuthenticate, (req, res) => partsController.getParts(req, res));

/**
 * @route   GET /api/parts/:partId
 * @desc    Retrieve single part details by ID
 * @access  Public / Authenticated (inactive parts hidden from non-admins)
 */
router.get('/:partId', optionalAuthenticate, (req, res) =>
  partsController.getPartById(req, res)
);

/**
 * @route   PUT /api/parts/:partId
 * @desc    Update an existing part catalogue entry
 * @access  Private (Admin only)
 */
router.put(
  '/:partId',
  authenticate,
  authorize(ROLES.ADMIN),
  validateUpdatePart,
  (req, res) => partsController.updatePart(req, res)
);

/**
 * @route   PATCH /api/parts/:partId/status
 * @desc    Activate or deactivate part status
 * @access  Private (Admin only)
 */
router.patch(
  '/:partId/status',
  authenticate,
  authorize(ROLES.ADMIN),
  validateUpdateStatus,
  (req, res) => partsController.updateStatus(req, res)
);

/**
 * @route   PATCH /api/parts/:partId/stock
 * @desc    Adjust inventory stock quantity (ADD or REMOVE)
 * @access  Private (Admin only)
 */
router.patch(
  '/:partId/stock',
  authenticate,
  authorize(ROLES.ADMIN),
  validateStockAdjustment,
  (req, res) => partsController.updateStock(req, res)
);

/**
 * @route   PATCH /api/parts/:partId/reserve
 * @desc    Reserve stock quantity for quotation/booking
 * @access  Private (Admin / Internal test endpoint)
 */
router.patch(
  '/:partId/reserve',
  authenticate,
  authorize(ROLES.ADMIN),
  validateStockReservation,
  (req, res) => partsController.reserveStock(req, res)
);

/**
 * @route   PATCH /api/parts/:partId/release
 * @desc    Release reserved stock quantity
 * @access  Private (Admin / Internal test endpoint)
 */
router.patch(
  '/:partId/release',
  authenticate,
  authorize(ROLES.ADMIN),
  validateStockRelease,
  (req, res) => partsController.releaseStock(req, res)
);

/**
 * @route   DELETE /api/parts/:partId
 * @desc    Soft-delete / deactivate a part
 * @access  Private (Admin only)
 */
router.delete(
  '/:partId',
  authenticate,
  authorize(ROLES.ADMIN),
  (req, res) => partsController.deactivatePart(req, res)
);

module.exports = router;
