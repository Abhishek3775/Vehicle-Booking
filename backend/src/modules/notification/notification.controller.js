const notificationService = require('./notification.service');
const { AppError } = require('../auth/auth.service');

/**
 * Notification Controller
 *
 * Handles HTTP requests for in-app notifications, read/unread states,
 * and device token management without direct MongoDB access.
 */
class NotificationController {
  /**
   * POST /api/notifications/devices
   * Register/update device push token
   */
  async registerDevice(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const result = await notificationService.registerDevice(userId, req.body);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      return NotificationController.handleError(res, error);
    }
  }

  /**
   * DELETE /api/notifications/devices/:deviceId
   * Remove/deactivate device token
   */
  async removeDevice(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const { deviceId } = req.params;
      const result = await notificationService.removeDevice(userId, deviceId);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      return NotificationController.handleError(res, error);
    }
  }

  /**
   * GET /api/notifications
   * List user notifications with filtering and pagination
   */
  async getNotifications(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const result = await notificationService.getUserNotifications({ userId, query: req.query });

      return res.status(200).json({
        success: true,
        message: 'Notifications fetched successfully',
        data: result.notifications,
        pagination: result.pagination,
      });
    } catch (error) {
      return NotificationController.handleError(res, error);
    }
  }

  /**
   * GET /api/notifications/unread-count
   * Fetch unread notification count for badge display
   */
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const result = await notificationService.getUnreadCount(userId);

      return res.status(200).json({
        success: true,
        message: 'Unread notification count fetched successfully',
        data: result,
      });
    } catch (error) {
      return NotificationController.handleError(res, error);
    }
  }

  /**
   * GET /api/notifications/:notificationId
   * Fetch single notification details
   */
  async getNotificationById(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const { notificationId } = req.params;
      const notification = await notificationService.getNotificationById(notificationId, userId);

      return res.status(200).json({
        success: true,
        message: 'Notification details fetched successfully',
        data: notification,
      });
    } catch (error) {
      return NotificationController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/notifications/:notificationId/read
   * Mark a single notification as read
   */
  async markAsRead(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const { notificationId } = req.params;
      const notification = await notificationService.markAsRead(notificationId, userId);

      return res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: notification,
      });
    } catch (error) {
      return NotificationController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/notifications/read-all
   * Mark all unread notifications as read
   */
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const result = await notificationService.markAllAsRead(userId);

      return res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
        data: result,
      });
    } catch (error) {
      return NotificationController.handleError(res, error);
    }
  }

  /**
   * DELETE /api/notifications/:notificationId
   * Soft delete a notification
   */
  async deleteNotification(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const { notificationId } = req.params;
      const notification = await notificationService.deleteNotification(notificationId, userId);

      return res.status(200).json({
        success: true,
        message: 'Notification deleted successfully',
        data: notification,
      });
    } catch (error) {
      return NotificationController.handleError(res, error);
    }
  }

  /**
   * Centralized HTTP error response handler
   */
  static handleError(res, error) {
    if (error instanceof AppError || error.statusCode) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        error: error.details || {},
      });
    }

    console.error('[NotificationController Internal Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected internal error occurred. Please try again later.',
      error: {},
    });
  }
}

module.exports = new NotificationController();
