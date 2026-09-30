const mongoose = require('mongoose');
const { AppError } = require('../auth/auth.service');
const notificationRepository = require('./notification.repository');
const notificationProvider = require('./notification.provider');
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  DELIVERY_STATUS,
  PAGINATION_LIMITS,
} = require('./notification.constants');

/**
 * Notification Service Layer
 *
 * Implements business logic for:
 * - In-app notification persistence in MongoDB
 * - Multi-device push notification delivery via Firebase FCM provider
 * - Graceful push failure isolation without affecting in-app notification state
 * - Automatic invalid device token deactivation
 * - Read/unread status transitions and efficient badge counting
 * - Loosely-coupled event notification helpers for Booking, Dispatch, Inspection, Quotation, Payment, and Invoice events
 */
class NotificationService {
  /**
   * Format Notification Mongoose document into standardized client-safe API response
   * @param {import('./notification.model')} notification
   * @returns {object}
   */
  formatNotificationResponse(notification) {
    return {
      id: notification._id ? notification._id.toString() : notification.id,
      userId: notification.userId
        ? notification.userId._id
          ? notification.userId._id.toString()
          : notification.userId.toString()
        : null,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      category: notification.category,
      entityType: notification.entityType || 'SYSTEM',
      entityId: notification.entityId ? notification.entityId.toString() : null,
      bookingId: notification.bookingId ? notification.bookingId.toString() : null,
      metadata: notification.metadata || {},
      channels: notification.channels || [NOTIFICATION_CHANNELS.IN_APP],
      isRead: notification.isRead,
      readAt: notification.readAt || null,
      deliveryStatus: notification.deliveryStatus || DELIVERY_STATUS.SENT,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  /**
   * Validate MongoDB ObjectId
   * @param {string} id
   * @param {string} [entityName='notification']
   * @throws {AppError}
   */
  assertValidObjectId(id, entityName = 'notification') {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid ${entityName} ID format.`, 400);
    }
  }

  /**
   * Create and deliver a notification
   * @param {object} params
   * @param {string|mongoose.Types.ObjectId} params.userId
   * @param {string} params.type
   * @param {string} params.title
   * @param {string} params.message
   * @param {string} params.category
   * @param {string} [params.entityType='SYSTEM']
   * @param {string|mongoose.Types.ObjectId} [params.entityId=null]
   * @param {string|mongoose.Types.ObjectId} [params.bookingId=null]
   * @param {object} [params.metadata={}]
   * @param {Array<string>} [params.channels=[NOTIFICATION_CHANNELS.IN_APP]]
   * @returns {Promise<object>}
   */
  async createNotification({
    userId,
    type,
    title,
    message,
    category,
    entityType = 'SYSTEM',
    entityId = null,
    bookingId = null,
    metadata = {},
    channels = [NOTIFICATION_CHANNELS.IN_APP],
  }) {
    this.assertValidObjectId(userId.toString(), 'user');

    // 1. Create in-app notification in MongoDB
    const notificationData = {
      userId: new mongoose.Types.ObjectId(userId.toString()),
      title: title.trim(),
      message: message.trim(),
      type,
      category,
      entityType,
      entityId: entityId ? new mongoose.Types.ObjectId(entityId.toString()) : null,
      bookingId: bookingId ? new mongoose.Types.ObjectId(bookingId.toString()) : null,
      metadata,
      channels,
      isRead: false,
      deliveryStatus: DELIVERY_STATUS.SENT,
    };

    const notification = await notificationRepository.createNotification(notificationData);

    // 2. Dispatch push notification if PUSH channel is requested
    if (channels.includes(NOTIFICATION_CHANNELS.PUSH)) {
      try {
        const userDevices = await notificationRepository.findUserActiveDevices(userId.toString());
        if (userDevices && userDevices.length > 0) {
          const tokens = userDevices.map((d) => d.token);
          const pushPayload = {
            tokens,
            title,
            body: message,
            data: {
              notificationId: notification._id.toString(),
              type,
              category,
              entityType,
              entityId: entityId ? entityId.toString() : '',
              bookingId: bookingId ? bookingId.toString() : '',
            },
          };

          const dispatchResult = await notificationProvider.sendToUserDevices(pushPayload);

          // If provider detected invalid or unregistered tokens, deactivate them safely
          if (dispatchResult.invalidTokens && dispatchResult.invalidTokens.length > 0) {
            for (const invalidToken of dispatchResult.invalidTokens) {
              await notificationRepository.deactivateTokenByString(invalidToken);
            }
          }
        }
      } catch (pushErr) {
        // Push delivery failure must never break in-app notification persistence
        notification.deliveryStatus = DELIVERY_STATUS.FAILED;
        notification.deliveryError = pushErr.message;
        await notification.save();
      }
    }

    return this.formatNotificationResponse(notification);
  }

  // ==========================================
  // EVENT-BASED NOTIFICATION HELPERS
  // ==========================================

  async notifyBookingCreated({ userId, bookingId, bookingReference }) {
    return this.createNotification({
      userId,
      type: NOTIFICATION_TYPES.BOOKING_CREATED,
      category: NOTIFICATION_CATEGORIES.BOOKING,
      title: 'Booking Created',
      message: `Your vehicle service booking ${bookingReference} has been successfully created.`,
      entityType: 'BOOKING',
      entityId: bookingId,
      bookingId,
      metadata: { bookingReference },
      channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.PUSH],
    });
  }

  async notifyMechanicAssigned({ customerUserId, mechanicUserId, bookingId, bookingReference, mechanicName }) {
    // Notify customer
    const customerPromise = this.createNotification({
      userId: customerUserId,
      type: NOTIFICATION_TYPES.MECHANIC_ASSIGNED,
      category: NOTIFICATION_CATEGORIES.DISPATCH,
      title: 'Mechanic Assigned',
      message: `Mechanic ${mechanicName || 'assigned'} is on their way for booking ${bookingReference}.`,
      entityType: 'BOOKING',
      entityId: bookingId,
      bookingId,
      metadata: { bookingReference, mechanicName },
      channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.PUSH],
    });

    // Notify mechanic if ID provided
    let mechanicPromise = Promise.resolve();
    if (mechanicUserId) {
      mechanicPromise = this.createNotification({
        userId: mechanicUserId,
        type: NOTIFICATION_TYPES.MECHANIC_ASSIGNED,
        category: NOTIFICATION_CATEGORIES.DISPATCH,
        title: 'New Service Job Assigned',
        message: `You have been assigned to service booking ${bookingReference}.`,
        entityType: 'BOOKING',
        entityId: bookingId,
        bookingId,
        metadata: { bookingReference },
        channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.PUSH],
      });
    }

    const [customerNotification] = await Promise.all([customerPromise, mechanicPromise]);
    return customerNotification;
  }

  async notifyMechanicArrived({ customerUserId, bookingId, bookingReference }) {
    return this.createNotification({
      userId: customerUserId,
      type: NOTIFICATION_TYPES.MECHANIC_ARRIVED,
      category: NOTIFICATION_CATEGORIES.DISPATCH,
      title: 'Mechanic Arrived',
      message: `The mechanic has arrived at your location for booking ${bookingReference}.`,
      entityType: 'BOOKING',
      entityId: bookingId,
      bookingId,
      metadata: { bookingReference },
      channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.PUSH],
    });
  }

  async notifyInspectionCompleted({ customerUserId, bookingId, inspectionId, bookingReference }) {
    return this.createNotification({
      userId: customerUserId,
      type: NOTIFICATION_TYPES.INSPECTION_COMPLETED,
      category: NOTIFICATION_CATEGORIES.INSPECTION,
      title: 'Inspection Completed',
      message: `Vehicle inspection for booking ${bookingReference} has been completed. A quotation will be prepared shortly.`,
      entityType: 'INSPECTION',
      entityId: inspectionId,
      bookingId,
      metadata: { bookingReference },
      channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.PUSH],
    });
  }

  async notifyQuotationSubmitted({ customerUserId, bookingId, quotationId, quotationReference, totalAmount }) {
    return this.createNotification({
      userId: customerUserId,
      type: NOTIFICATION_TYPES.QUOTATION_SUBMITTED,
      category: NOTIFICATION_CATEGORIES.QUOTATION,
      title: 'Quotation Ready for Approval',
      message: `Quotation ${quotationReference} for ₹${totalAmount} is ready for your review and approval.`,
      entityType: 'QUOTATION',
      entityId: quotationId,
      bookingId,
      metadata: { quotationReference, totalAmount },
      channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.PUSH],
    });
  }

  async notifyQuotationApproved({ mechanicUserId, bookingId, quotationId, quotationReference }) {
    if (!mechanicUserId) return null;
    return this.createNotification({
      userId: mechanicUserId,
      type: NOTIFICATION_TYPES.QUOTATION_APPROVED,
      category: NOTIFICATION_CATEGORIES.QUOTATION,
      title: 'Quotation Approved',
      message: `Customer approved quotation ${quotationReference}. You may proceed with the service.`,
      entityType: 'QUOTATION',
      entityId: quotationId,
      bookingId,
      metadata: { quotationReference },
      channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.PUSH],
    });
  }

  async notifyPaymentSuccess({ customerUserId, bookingId, paymentId, paymentReference, amount }) {
    return this.createNotification({
      userId: customerUserId,
      type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
      category: NOTIFICATION_CATEGORIES.PAYMENT,
      title: 'Payment Successful',
      message: `Payment of ₹${amount} (${paymentReference}) was successfully settled.`,
      entityType: 'PAYMENT',
      entityId: paymentId,
      bookingId,
      metadata: { paymentReference, amount },
      channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.PUSH],
    });
  }

  async notifyInvoiceGenerated({ customerUserId, bookingId, invoiceId, invoiceNumber, totalAmount }) {
    return this.createNotification({
      userId: customerUserId,
      type: NOTIFICATION_TYPES.INVOICE_GENERATED,
      category: NOTIFICATION_CATEGORIES.INVOICE,
      title: 'Invoice Generated',
      message: `Invoice ${invoiceNumber} for ₹${totalAmount} has been generated for your service.`,
      entityType: 'INVOICE',
      entityId: invoiceId,
      bookingId,
      metadata: { invoiceNumber, totalAmount },
      channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.PUSH],
    });
  }

  // ==========================================
  // USER NOTIFICATION MANAGEMENT
  // ==========================================

  /**
   * Retrieve list of notifications for the authenticated user
   * @param {object} params
   * @param {string} params.userId
   * @param {object} [params.query={}]
   * @returns {Promise<{ notifications: Array<object>, pagination: object }>}
   */
  async getUserNotifications({ userId, query = {} }) {
    this.assertValidObjectId(userId, 'user');

    const page = Math.max(parseInt(query.page, 10) || PAGINATION_LIMITS.DEFAULT_PAGE, 1);
    const limit = Math.min(
      Math.max(parseInt(query.limit, 10) || PAGINATION_LIMITS.DEFAULT_LIMIT, 1),
      PAGINATION_LIMITS.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const filter = {};

    // Filter by read status
    if (query.isRead !== undefined) {
      filter.isRead = String(query.isRead).toLowerCase() === 'true';
    }

    // Filter by category
    if (query.category) {
      const normCat = query.category.toUpperCase().trim();
      if (Object.values(NOTIFICATION_CATEGORIES).includes(normCat)) {
        filter.category = normCat;
      }
    }

    const sort = { createdAt: -1 };

    const [notifications, total] = await Promise.all([
      notificationRepository.findNotificationsByUser({
        userId,
        filter,
        sort,
        skip,
        limit,
      }),
      notificationRepository.countNotificationsByUser({ userId, filter }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      notifications: notifications.map((n) => this.formatNotificationResponse(n)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Retrieve a single notification by ID (Strict ownership-scoped)
   * @param {string} notificationId
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getNotificationById(notificationId, userId) {
    this.assertValidObjectId(notificationId, 'notification');
    this.assertValidObjectId(userId, 'user');

    const notification = await notificationRepository.findNotificationById(notificationId);
    if (!notification) {
      throw new AppError('Notification not found.', 404);
    }

    if (notification.userId.toString() !== userId.toString()) {
      throw new AppError('Access denied: You are not authorized to view this notification.', 403);
    }

    return this.formatNotificationResponse(notification);
  }

  /**
   * Mark a single notification as read
   * @param {string} notificationId
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async markAsRead(notificationId, userId) {
    this.assertValidObjectId(notificationId, 'notification');
    this.assertValidObjectId(userId, 'user');

    const notification = await notificationRepository.findNotificationById(notificationId);
    if (!notification) {
      throw new AppError('Notification not found.', 404);
    }

    if (notification.userId.toString() !== userId.toString()) {
      throw new AppError('Access denied: You are not authorized to modify this notification.', 403);
    }

    if (notification.isRead) {
      return this.formatNotificationResponse(notification);
    }

    const updated = await notificationRepository.markAsRead(notificationId, userId, new Date());
    return this.formatNotificationResponse(updated);
  }

  /**
   * Mark all unread notifications as read for a user
   * @param {string} userId
   * @returns {Promise<{ modifiedCount: number }>}
   */
  async markAllAsRead(userId) {
    this.assertValidObjectId(userId, 'user');
    return notificationRepository.markAllAsRead(userId, new Date());
  }

  /**
   * Get unread notification count for badge display
   * @param {string} userId
   * @returns {Promise<{ count: number }>}
   */
  async getUnreadCount(userId) {
    this.assertValidObjectId(userId, 'user');
    const count = await notificationRepository.countUnread(userId);
    return { count };
  }

  /**
   * Soft delete a notification
   * @param {string} notificationId
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async deleteNotification(notificationId, userId) {
    this.assertValidObjectId(notificationId, 'notification');
    this.assertValidObjectId(userId, 'user');

    const notification = await notificationRepository.findNotificationById(notificationId);
    if (!notification) {
      throw new AppError('Notification not found.', 404);
    }

    if (notification.userId.toString() !== userId.toString()) {
      throw new AppError('Access denied: You are not authorized to delete this notification.', 403);
    }

    const deleted = await notificationRepository.softDeleteNotification(notificationId, userId, new Date());
    return this.formatNotificationResponse(deleted);
  }

  // ==========================================
  // DEVICE TOKEN REGISTRATION
  // ==========================================

  /**
   * Register or update device push token
   * @param {string} userId
   * @param {object} deviceData
   * @param {string} deviceData.token
   * @param {string} deviceData.platform
   * @param {string} deviceData.deviceId
   * @param {string} [deviceData.appVersion]
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async registerDevice(userId, { token, platform, deviceId, appVersion }) {
    this.assertValidObjectId(userId, 'user');

    await notificationRepository.registerDeviceToken({
      userId: new mongoose.Types.ObjectId(userId),
      token,
      platform,
      deviceId,
      appVersion,
    });

    return {
      success: true,
      message: 'Device token registered successfully',
    };
  }

  /**
   * Deactivate a user device
   * @param {string} userId
   * @param {string} deviceId
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async removeDevice(userId, deviceId) {
    this.assertValidObjectId(userId, 'user');

    const device = await notificationRepository.deactivateDeviceToken(userId, deviceId);
    if (!device) {
      throw new AppError('Device not found or not registered to your account.', 404);
    }

    return {
      success: true,
      message: 'Device deactivated successfully',
    };
  }
}

module.exports = new NotificationService();
