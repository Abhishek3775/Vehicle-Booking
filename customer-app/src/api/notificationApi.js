import api from './axiosInstance';

export const notificationApi = {
  /**
   * Fetch customer notifications with pagination & filter
   * @param {object} params - { page, limit, isRead, category }
   */
  async getNotifications(params = {}) {
    const response = await api.get('/api/notifications', { params });
    return response.data;
  },

  /**
   * Get count of unread notifications for badge display
   */
  async getUnreadCount() {
    const response = await api.get('/api/notifications/unread-count');
    return response.data;
  },

  /**
   * Mark single notification as read
   * @param {string} notificationId
   */
  async markAsRead(notificationId) {
    const response = await api.patch(`/api/notifications/${notificationId}/read`);
    return response.data;
  },

  /**
   * Mark all unread notifications as read
   */
  async markAllAsRead() {
    const response = await api.patch('/api/notifications/read-all');
    return response.data;
  },

  /**
   * Soft delete a notification
   * @param {string} notificationId
   */
  async deleteNotification(notificationId) {
    const response = await api.delete(`/api/notifications/${notificationId}`);
    return response.data;
  },

  /**
   * Register or update device push token
   * @param {object} payload - { token, platform, deviceId, appVersion }
   */
  async registerDevice(payload) {
    const response = await api.post('/api/notifications/devices', payload);
    return response.data;
  },
};

export default notificationApi;
