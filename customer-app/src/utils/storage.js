import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/apiConfig';

/**
 * Storage utility providing safe, asynchronous token and profile persistence.
 */
export const storage = {
  async getAccessToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch {
      return null;
    }
  },

  async setAccessToken(token) {
    try {
      if (token) {
        await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      }
    } catch (e) {
      console.error('Failed to set access token in storage:', e);
    }
  },

  async getRefreshToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token) {
    try {
      if (token) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      }
    } catch (e) {
      console.error('Failed to set refresh token in storage:', e);
    }
  },

  async getUser() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async setUser(user) {
    try {
      if (user) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      }
    } catch (e) {
      console.error('Failed to set user in storage:', e);
    }
  },

  async saveAuthSession({ accessToken, refreshToken, user }) {
    try {
      const entries = [];
      if (accessToken) entries.push([STORAGE_KEYS.ACCESS_TOKEN, accessToken]);
      if (refreshToken) entries.push([STORAGE_KEYS.REFRESH_TOKEN, refreshToken]);
      if (user) entries.push([STORAGE_KEYS.USER_DATA, JSON.stringify(user)]);
      if (entries.length > 0) {
        await AsyncStorage.multiSet(entries);
      }
    } catch (e) {
      console.error('Failed to save auth session:', e);
    }
  },

  async clearAuthSession() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
      ]);
    } catch (e) {
      console.error('Failed to clear auth session:', e);
    }
  },

  async getDeviceId() {
    try {
      let deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
      if (!deviceId) {
        deviceId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
      }
      return deviceId;
    } catch {
      return `cust_fallback_${Date.now()}`;
    }
  },
};

export default storage;
