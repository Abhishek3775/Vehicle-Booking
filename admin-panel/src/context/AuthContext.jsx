import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/auth.api';
import { adminApi } from '../services/admin.api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(() => {
    try {
      const stored = localStorage.getItem('admin_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('admin_access_token') || null);
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('admin_refresh_token') || null);
  const [loading, setLoading] = useState(true);

  // Synchronize admin profile on startup if token exists
  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem('admin_access_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await adminApi.getProfile();
      if (response.success && response.data) {
        setAdmin(response.data);
        localStorage.setItem('admin_user', JSON.stringify(response.data));
      }
    } catch (err) {
      console.error('Failed to restore admin profile session:', err.message);
      // If unauthorized, clear tokens
      if (err.status === 401 || err.status === 403) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = async (email, password) => {
    const response = await authApi.login(email, password);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Login failed');
    }

    const { user, accessToken: newAccess, refreshToken: newRefresh } = response.data;

    if (user.role !== 'ADMIN') {
      throw new Error('Access denied: Only users with the ADMIN role can access the Admin Dashboard.');
    }

    localStorage.setItem('admin_access_token', newAccess);
    if (newRefresh) localStorage.setItem('admin_refresh_token', newRefresh);
    localStorage.setItem('admin_user', JSON.stringify(user));

    setAccessToken(newAccess);
    if (newRefresh) setRefreshToken(newRefresh);
    setAdmin(user);

    // Fetch rich admin profile details
    try {
      const profileRes = await adminApi.getProfile();
      if (profileRes.success && profileRes.data) {
        setAdmin(profileRes.data);
        localStorage.setItem('admin_user', JSON.stringify(profileRes.data));
      }
    } catch (err) {
      console.warn('Admin profile load warning:', err.message);
    }

    return response;
  };

  const sendOtp = async (phone) => {
    return authApi.sendOtp(phone, 'ADMIN');
  };

  const verifyOtp = async (phone, otp) => {
    const response = await authApi.verifyOtp(phone, otp);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'OTP verification failed');
    }

    const { user, accessToken: newAccess, refreshToken: newRefresh } = response.data;

    if (user.role !== 'ADMIN') {
      throw new Error('Access denied: Only users with the ADMIN role can access the Admin Dashboard.');
    }

    localStorage.setItem('admin_access_token', newAccess);
    if (newRefresh) localStorage.setItem('admin_refresh_token', newRefresh);
    localStorage.setItem('admin_user', JSON.stringify(user));

    setAccessToken(newAccess);
    if (newRefresh) setRefreshToken(newRefresh);
    setAdmin(user);

    // Fetch rich admin profile details
    try {
      const profileRes = await adminApi.getProfile();
      if (profileRes.success && profileRes.data) {
        setAdmin(profileRes.data);
        localStorage.setItem('admin_user', JSON.stringify(profileRes.data));
      }
    } catch (err) {
      console.warn('Admin profile load warning:', err.message);
    }

    return response;
  };

  const logout = async () => {
    const rToken = localStorage.getItem('admin_refresh_token');
    try {
      if (rToken) {
        await authApi.logout(rToken);
      }
    } catch (err) {
      console.warn('Logout API error:', err.message);
    } finally {
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_refresh_token');
      localStorage.removeItem('admin_user');
      setAccessToken(null);
      setRefreshToken(null);
      setAdmin(null);
      window.location.href = '/login';
    }
  };

  const refreshAdminProfile = async () => {
    try {
      const response = await adminApi.getProfile();
      if (response.success && response.data) {
        setAdmin(response.data);
        localStorage.setItem('admin_user', JSON.stringify(response.data));
        return response.data;
      }
    } catch (err) {
      console.error('Failed to refresh admin profile:', err.message);
    }
  };

  const isAuthenticated = Boolean(accessToken && admin);
  const isAdmin = admin?.role === 'ADMIN' || Boolean(admin?.adminCode);

  return (
    <AuthContext.Provider
      value={{
        admin,
        accessToken,
        refreshToken,
        loading,
        isAuthenticated,
        isAdmin,
        login,
        sendOtp,
        verifyOtp,
        logout,
        refreshAdminProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
