import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { notificationApi } from '../api/notificationApi';
import { AuthContext } from './AuthContext';

export const NotificationContext = createContext({
  unreadCount: 0,
  notifications: [],
  isLoading: false,
  fetchNotifications: async () => {},
  fetchUnreadCount: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
});

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationApi.getUnreadCount();
      if (res?.data?.unreadCount !== undefined) {
        setUnreadCount(res.data.unreadCount);
      }
    } catch {
      // Non-blocking
    }
  }, [isAuthenticated]);

  const fetchNotifications = useCallback(
    async (params = { page: 1, limit: 20 }) => {
      if (!isAuthenticated) return;
      setIsLoading(true);
      try {
        const res = await notificationApi.getNotifications(params);
        if (res?.data) {
          setNotifications(res.data);
        }
        await fetchUnreadCount();
      } catch (err) {
        console.warn('Failed to fetch notifications:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, fetchUnreadCount]
  );

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId || n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all notifications read:', err);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await notificationApi.deleteNotification(notificationId);
      setNotifications((prev) =>
        prev.filter((n) => n._id !== notificationId && n.id !== notificationId)
      );
    } catch (err) {
      console.warn('Failed to delete notification:', err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      // Polling or refresh interval for notifications badge
      const timer = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(timer);
    } else {
      setUnreadCount(0);
      setNotifications([]);
    }
  }, [isAuthenticated, fetchUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        isLoading,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
