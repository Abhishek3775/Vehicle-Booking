import api from './axiosInstance';

export const authApi = {
  /**
   * Request a 6-digit OTP for phone authentication
   * @param {string} phone
   */
  async sendOtp(phone) {
    const response = await api.post('/api/auth/send-otp', { phone });
    return response.data;
  },

  /**
   * Verify OTP and receive JWT access & refresh tokens
   * @param {string} phone
   * @param {string} otp
   */
  async verifyOtp(phone, otp) {
    const response = await api.post('/api/auth/verify-otp', { phone, otp });
    return response.data;
  },

  /**
   * Refresh expired access token
   * @param {string} refreshToken
   */
  async refreshToken(refreshToken) {
    const response = await api.post('/api/auth/refresh-token', { refreshToken });
    return response.data;
  },

  /**
   * Invalidate session and refresh token
   * @param {string} refreshToken
   */
  async logout(refreshToken) {
    const response = await api.post('/api/auth/logout', { refreshToken });
    return response.data;
  },

  /**
   * Retrieve current authenticated user account
   */
  async getMe() {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

export default authApi;
