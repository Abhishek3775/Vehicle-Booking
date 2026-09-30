const Notification = require('./notification.model');
const DeviceToken = require('./device-token.model');

/**
 * Notification Repository Layer
 *
 * Dedicated database abstraction handling MongoDB operations for Notification and DeviceToken.
 * Contains zero HTTP or business logic.
 */
class NotificationRepository {
  /**
   * Insert a new notification document
   * @param {object} data
   * @returns {Promise<Notification>}
   */
  async createNotification(data) {
    const notification = new Notification(data);
    return notification.save();
  }

  /**
   * Find notification by MongoDB ID
   * @param {string} id
   * @returns {Promise<Notification|null>}
   */
  async findNotificationById(id) {
    return Notification.findOne({ _id: id, isDeleted: false }).exec();
  }

  /**
   * Find notifications for a specific user with filtering and pagination
   * @param {object} params
   * @param {string} params.userId
   * @param {object} [params.filter={}]
   * @param {object} [params.sort={ createdAt: -1 }]
   * @param {number} [params.skip=0]
   * @param {number} [params.limit=20]
   * @returns {Promise<Array<Notification>>}
   */
  async findNotificationsByUser({ userId, filter = {}, sort = { createdAt: -1 }, skip = 0, limit = 20 }) {
    return Notification.find({ userId, isDeleted: false, ...filter })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();
  }

  /**
   * Count notifications for a user matching filter
   * @param {object} params
   * @param {string} params.userId
   * @param {object} [params.filter={}]
   * @returns {Promise<number>}
   */
  async countNotificationsByUser({ userId, filter = {} }) {
    return Notification.countDocuments({ userId, isDeleted: false, ...filter }).exec();
  }

  /**
   * Mark a single notification as read
   * @param {string} id
   * @param {string} userId
   * @param {Date} [readAt=new Date()]
   * @returns {Promise<Notification|null>}
   */
  async markAsRead(id, userId, readAt = new Date()) {
    return Notification.findOneAndUpdate(
      { _id: id, userId, isDeleted: false },
      { $set: { isRead: true, readAt } },
      { new: true }
    ).exec();
  }

  /**
   * Bulk mark all unread notifications as read for a user
   * @param {string} userId
   * @param {Date} [readAt=new Date()]
   * @returns {Promise<{ modifiedCount: number }>}
   */
  async markAllAsRead(userId, readAt = new Date()) {
    const result = await Notification.updateMany(
      { userId, isRead: false, isDeleted: false },
      { $set: { isRead: true, readAt } }
    ).exec();

    return { modifiedCount: result.modifiedCount || 0 };
  }

  /**
   * Count unread notifications for a user
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async countUnread(userId) {
    return Notification.countDocuments({ userId, isRead: false, isDeleted: false }).exec();
  }

  /**
   * Soft delete a single notification
   * @param {string} id
   * @param {string} userId
   * @param {Date} [deletedAt=new Date()]
   * @returns {Promise<Notification|null>}
   */
  async softDeleteNotification(id, userId, deletedAt = new Date()) {
    return Notification.findOneAndUpdate(
      { _id: id, userId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt } },
      { new: true }
    ).exec();
  }

  /**
   * Register or update a device token (Idempotent upsert)
   * @param {object} params
   * @param {string} params.userId
   * @param {string} params.token
   * @param {string} params.platform
   * @param {string} params.deviceId
   * @param {string} [params.appVersion]
   * @returns {Promise<DeviceToken>}
   */
  async registerDeviceToken({ userId, token, platform, deviceId, appVersion = '1.0.0' }) {
    // If token already exists under another user/device, reassign and activate
    return DeviceToken.findOneAndUpdate(
      { token: token.trim() },
      {
        $set: {
          userId,
          platform,
          deviceId: deviceId.trim(),
          appVersion,
          isActive: true,
          lastUsedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec();
  }

  /**
   * Find active device tokens for a user
   * @param {string} userId
   * @returns {Promise<Array<DeviceToken>>}
   */
  async findUserActiveDevices(userId) {
    return DeviceToken.find({ userId, isActive: true }).exec();
  }

  /**
   * Deactivate a specific device for a user
   * @param {string} userId
   * @param {string} deviceId
   * @returns {Promise<DeviceToken|null>}
   */
  async deactivateDeviceToken(userId, deviceId) {
    return DeviceToken.findOneAndUpdate(
      { userId, deviceId: deviceId.trim() },
      { $set: { isActive: false } },
      { new: true }
    ).exec();
  }

  /**
   * Deactivate a token string across all users (e.g. invalid FCM token)
   * @param {string} token
   * @returns {Promise<DeviceToken|null>}
   */
  async deactivateTokenByString(token) {
    return DeviceToken.findOneAndUpdate(
      { token: token.trim() },
      { $set: { isActive: false } },
      { new: true }
    ).exec();
  }

  /**
   * Find a device by token
   * @param {string} token
   * @returns {Promise<DeviceToken|null>}
   */
  async findDeviceByToken(token) {
    return DeviceToken.findOne({ token: token.trim() }).exec();
  }
}

module.exports = new NotificationRepository();
