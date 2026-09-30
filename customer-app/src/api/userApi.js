import api from './axiosInstance';

export const userApi = {
  /**
   * Fetch current authenticated user's profile
   */
  async getProfile() {
    const response = await api.get('/api/users/profile');
    return response.data;
  },

  /**
   * Update current user's profile
   * @param {object} profileData
   */
  async updateProfile(profileData) {
    const response = await api.put('/api/users/profile', profileData);
    return response.data;
  },

  /**
   * Update profile image URL / avatar
   * @param {string} profileImage
   */
  async updateProfileImage(profileImage) {
    const response = await api.put('/api/users/profile-image', { profileImage });
    return response.data;
  },

  /**
   * Safe account deactivation
   */
  async deactivateAccount() {
    const response = await api.delete('/api/users/account');
    return response.data;
  },
};

export default userApi;
