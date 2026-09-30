import api from './api';

export const authApi = {
  /**
   * Authenticate admin using email and password
   * @param {string} email
   * @param {string} password
   */
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  /**
   * Request 6-digit OTP for login
   * @param {string} phone
   * @param {string} [role='ADMIN']
   */
  sendOtp: async (phone, role = 'ADMIN') => {
    const response = await api.post('/auth/send-otp', { phone, role });
    return response.data;
  },

  /**
   * Verify OTP and receive JWT tokens
   * @param {string} phone
   * @param {string} otp
   */
  verifyOtp: async (phone, otp) => {
    const response = await api.post('/auth/verify-otp', { phone, otp });
    return response.data;
  },

  /**
   * Refresh JWT access token
   * @param {string} refreshToken
   */
  refreshToken: async (refreshToken) => {
    const response = await api.post('/auth/refresh-token', { refreshToken });
    return response.data;
  },

  /**
   * Invalidate current refresh token and logout
   * @param {string} refreshToken
   */
  logout: async (refreshToken) => {
    const response = await api.post('/auth/logout', { refreshToken });
    return response.data;
  },

  /**
   * Get current authenticated user details
   */
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};
