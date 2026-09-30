const express = require('express');
const adminController = require('./admin.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { ROLES } = require('../auth/auth.constants');
const {
  validateIdParam,
  validateUpdateProfile,
  validateUpdateUserStatus,
  validateUpdateMechanicVerification,
  validateCancelBooking,
  validatePaginationQuery,
  validateDashboardFilter,
  validateAuditLogQuery,
} = require('./admin.validation');

const router = express.Router();

// Strict global guard: All Admin routes require valid JWT and ADMIN role
router.use(authenticate, authorize(ROLES.ADMIN));

/**
 * Admin Profile Routes
 */
router.get('/profile', adminController.getProfile);
router.put('/profile', validateUpdateProfile, adminController.updateProfile);

/**
 * Dashboard & Analytics Routes
 */
router.get('/dashboard', adminController.getDashboard);
router.get('/dashboard/bookings', validateDashboardFilter, adminController.getBookingAnalytics);
router.get('/dashboard/revenue', validateDashboardFilter, adminController.getRevenueAnalytics);
router.get('/dashboard/mechanics', adminController.getMechanicAnalytics);

/**
 * Global Multi-Collection Search
 */
router.get('/search', adminController.globalSearch);

/**
 * User Management Routes
 */
router.get('/users', validatePaginationQuery, adminController.getUsers);
router.get('/users/:userId', validateIdParam('userId'), adminController.getUserDetails);
router.patch(
  '/users/:userId/status',
  validateIdParam('userId'),
  validateUpdateUserStatus,
  adminController.updateUserStatus
);

/**
 * Mechanic Management Routes
 */
router.get('/mechanics', validatePaginationQuery, adminController.getMechanics);
router.get('/mechanics/:mechanicId', validateIdParam('mechanicId'), adminController.getMechanicDetails);
router.patch(
  '/mechanics/:mechanicId/verification',
  validateIdParam('mechanicId'),
  validateUpdateMechanicVerification,
  adminController.updateMechanicVerification
);

/**
 * Booking Management Routes
 */
router.get('/bookings', validatePaginationQuery, adminController.getBookings);
router.get('/bookings/:bookingId', validateIdParam('bookingId'), adminController.getBookingDetails);
router.patch(
  '/bookings/:bookingId/cancel',
  validateIdParam('bookingId'),
  validateCancelBooking,
  adminController.cancelBooking
);

/**
 * Audit Logs Routes
 */
router.get(
  '/audit-logs',
  validatePaginationQuery,
  validateAuditLogQuery,
  adminController.getAuditLogs
);

module.exports = router;
