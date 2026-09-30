const express = require('express');
const notificationController = require('./notification.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const {
  validateNotificationIdParam,
  validateDeviceIdParam,
  validateRegisterDevice,
  validateGetNotificationsQuery,
} = require('./notification.validation');

const router = express.Router();

/**
 * @route   POST /api/notifications/devices
 * @desc    Register or update device push token
 * @access  Private (Authenticated Users)
 */
router.post(
  '/devices',
  authenticate,
  validateRegisterDevice,
  notificationController.registerDevice
);

/**
 * @route   DELETE /api/notifications/devices/:deviceId
 * @desc    Deactivate device push token
 * @access  Private (Authenticated Users)
 */
router.delete(
  '/devices/:deviceId',
  authenticate,
  validateDeviceIdParam,
  notificationController.removeDevice
);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications for badge display
 * @access  Private (Authenticated Users)
 */
router.get(
  '/unread-count',
  authenticate,
  notificationController.getUnreadCount
);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all unread notifications as read
 * @access  Private (Authenticated Users)
 */
router.patch(
  '/read-all',
  authenticate,
  notificationController.markAllAsRead
);

/**
 * @route   GET /api/notifications
 * @desc    Fetch notifications list for authenticated user
 * @access  Private (Authenticated Users)
 */
router.get(
  '/',
  authenticate,
  validateGetNotificationsQuery,
  notificationController.getNotifications
);

/**
 * @route   GET /api/notifications/:notificationId
 * @desc    Fetch single notification details by ID
 * @access  Private (Authenticated Users)
 */
router.get(
  '/:notificationId',
  authenticate,
  validateNotificationIdParam,
  notificationController.getNotificationById
);

/**
 * @route   PATCH /api/notifications/:notificationId/read
 * @desc    Mark single notification as read
 * @access  Private (Authenticated Users)
 */
router.patch(
  '/:notificationId/read',
  authenticate,
  validateNotificationIdParam,
  notificationController.markAsRead
);

/**
 * @route   DELETE /api/notifications/:notificationId
 * @desc    Soft delete a notification
 * @access  Private (Authenticated Users)
 */
router.delete(
  '/:notificationId',
  authenticate,
  validateNotificationIdParam,
  notificationController.deleteNotification
);

module.exports = router;
