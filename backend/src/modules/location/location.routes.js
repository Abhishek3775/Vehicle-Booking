const express = require('express');
const locationController = require('./location.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { ROLES } = require('../auth/auth.constants');
const {
  validateCustomerCurrentLocation,
  validateMechanicCurrentLocation,
  validateNearbyMechanicsQuery,
  validateDistancePayload,
  validateHistoryQuery,
  validateMechanicIdParam,
} = require('./location.validation');

const router = express.Router();

/**
 * ==========================================
 * Utility Endpoints
 * ==========================================
 */

// POST /api/locations/distance - Calculate straight-line Haversine distance
router.post(
  '/distance',
  authenticate,
  validateDistancePayload,
  locationController.calculateDistance
);

/**
 * ==========================================
 * Customer Location Endpoints
 * ==========================================
 */

// POST /api/locations/current - Update current customer location
router.post(
  '/current',
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.ADMIN),
  validateCustomerCurrentLocation,
  locationController.updateCustomerCurrentLocation
);

// GET /api/locations/current - Get current customer location
router.get(
  '/current',
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.ADMIN),
  locationController.getCustomerCurrentLocation
);

// GET /api/locations/history - Get customer location history (paginated)
router.get(
  '/history',
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.ADMIN),
  validateHistoryQuery,
  locationController.getCustomerLocationHistory
);

// DELETE /api/locations/history - Clear customer location history
router.delete(
  '/history',
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.ADMIN),
  locationController.clearCustomerLocationHistory
);

/**
 * ==========================================
 * Mechanic Location Endpoints
 * ==========================================
 */

// POST /api/locations/mechanic/current - Update current mechanic location
router.post(
  '/mechanic/current',
  authenticate,
  authorize(ROLES.MECHANIC),
  validateMechanicCurrentLocation,
  locationController.updateMechanicCurrentLocation
);

// GET /api/locations/mechanic/current - Get current mechanic location (self)
router.get(
  '/mechanic/current',
  authenticate,
  authorize(ROLES.MECHANIC),
  locationController.getMechanicCurrentLocationSelf
);

/**
 * ==========================================
 * Operational / Dispatch / Admin Endpoints
 * ==========================================
 */

// GET /api/locations/mechanics/nearby - Find eligible mechanics near coordinates
router.get(
  '/mechanics/nearby',
  authenticate,
  validateNearbyMechanicsQuery,
  locationController.getNearbyMechanics
);

// GET /api/locations/mechanics/:mechanicId - Get specific mechanic location (Admin or self only)
router.get(
  '/mechanics/:mechanicId',
  authenticate,
  validateMechanicIdParam,
  locationController.getMechanicCurrentLocationById
);

module.exports = router;
