import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Base API URL configuration
// Automatically detects your PC's IP when scanning with Expo Go on a physical phone
const DEFAULT_PORT = 5000;

const getDevBaseUrl = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:${DEFAULT_PORT}`;
    }
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEFAULT_PORT}`;
  }
  return `http://localhost:${DEFAULT_PORT}`;
};

export const API_BASE_URL = getDevBaseUrl();

export const API_TIMEOUT = 15000; // 15 seconds

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@auth_access_token',
  REFRESH_TOKEN: '@auth_refresh_token',
  USER_DATA: '@auth_user_data',
  DEVICE_ID: '@device_unique_id',
  FCM_TOKEN: '@fcm_push_token',
};
