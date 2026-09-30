import React, { createContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';
import { authApi } from '../api/authApi';
import { userApi } from '../api/userApi';
import { authEvents } from '../api/axiosInstance';
import { fcmManager } from '../utils/fcm';

export const AuthContext = createContext({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  phonePending: null,
  login: async () => {},
  verifyOtp: async () => {},
  sendOtp: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
  setUser: () => {},
});

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [phonePending, setPhonePending] = useState(null);

  // Restore session from AsyncStorage on startup
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = await storage.getAccessToken();
        const savedUser = await storage.getUser();

        if (token && savedUser) {
          setUser(savedUser);
          setIsAuthenticated(true);

          // Quietly sync latest user profile in background
          try {
            const profileRes = await userApi.getProfile();
            if (profileRes?.data) {
              setUser(profileRes.data);
              await storage.setUser(profileRes.data);
            }
          } catch {
            // Non-blocking: rely on persisted user data if offline
          }
        }
      } catch (err) {
        console.warn('Error restoring auth session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to forced logout events (from 401 refresh failures)
    const unsubscribe = authEvents.subscribe(async () => {
      await logout();
    });

    return () => unsubscribe();
  }, []);

  // Request OTP for phone
  const sendOtp = useCallback(async (phone) => {
    const res = await authApi.sendOtp(phone);
    setPhonePending(phone);
    return res;
  }, []);

  // Verify OTP and persist session
  const verifyOtp = useCallback(async (phone, otp) => {
    const res = await authApi.verifyOtp(phone, otp);
    const payload = res?.data || res;
    const { accessToken, refreshToken, user: authUser } = payload || {};

    if (accessToken && refreshToken) {
      await storage.saveAuthSession({
        accessToken,
        refreshToken,
        user: authUser,
      });

      setUser(authUser);
      setIsAuthenticated(true);
      setPhonePending(null);

      // Register push notification token
      fcmManager.initPushNotifications().catch(() => {});

      // Try fetching full profile details
      try {
        const profileRes = await userApi.getProfile();
        if (profileRes?.data) {
          setUser(profileRes.data);
          await storage.setUser(profileRes.data);
        }
      } catch {
        // Auth user is sufficient
      }
    }

    return res;
  }, []);

  // Logout and clear persisted session
  const logout = useCallback(async () => {
    try {
      const refreshToken = await storage.getRefreshToken();
      if (refreshToken) {
        await authApi.logout(refreshToken).catch(() => {});
      }
    } finally {
      await storage.clearAuthSession();
      setUser(null);
      setIsAuthenticated(false);
      setPhonePending(null);
    }
  }, []);

  // Sync profile data from backend
  const refreshProfile = useCallback(async () => {
    try {
      const res = await userApi.getProfile();
      if (res?.data) {
        setUser(res.data);
        await storage.setUser(res.data);
      }
      return res?.data;
    } catch (err) {
      console.warn('Failed to refresh user profile:', err);
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        phonePending,
        setPhonePending,
        sendOtp,
        verifyOtp,
        logout,
        refreshProfile,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
