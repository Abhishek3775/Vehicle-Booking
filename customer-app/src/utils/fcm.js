import { Platform } from 'react-native';
import { storage } from './storage';
import { notificationApi } from '../api/notificationApi';

/**
 * Push Notification / FCM Manager
 * Manages device registration and token synchronization with the backend.
 */
export const fcmManager = {
  async initPushNotifications() {
    try {
      const deviceId = await storage.getDeviceId();
      let platform = 'WEB';
      if (Platform.OS === 'android') platform = 'ANDROID';
      if (Platform.OS === 'ios') platform = 'IOS';

      // Generate or retrieve mock/device token
      let token = await storage.getRefreshToken();
      if (!token) {
        token = `fcm_${deviceId}_${Date.now()}`;
      }

      // Register device with backend if user is authenticated
      const accessToken = await storage.getAccessToken();
      if (accessToken) {
        await notificationApi.registerDevice({
          token,
          platform,
          deviceId,
          appVersion: '1.0.0',
        });
      }
      return token;
    } catch (error) {
      console.warn('FCM registration skipped or not supported:', error.message);
      return null;
    }
  },
};

export default fcmManager;
