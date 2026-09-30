import api from './axiosInstance';

export const packageApi = {
  /**
   * Retrieve list of service packages
   * @param {object} params - { vehicleType, search, page, limit }
   */
  async getPackages(params = {}) {
    const response = await api.get('/api/service-packages', { params });
    return response.data;
  },

  /**
   * Retrieve package details by ID
   * @param {string} packageId
   */
  async getPackageById(packageId) {
    const response = await api.get(`/api/service-packages/${packageId}`);
    return response.data;
  },
};

export default packageApi;
