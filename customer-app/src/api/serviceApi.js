import api from './axiosInstance';

export const serviceApi = {
  /**
   * Retrieve list of services with filtering, search, and pagination
   * @param {object} params - { category, vehicleType, search, page, limit }
   */
  async getServices(params = {}) {
    const response = await api.get('/api/services', { params });
    return response.data;
  },

  /**
   * Retrieve service details by ID
   * @param {string} serviceId
   */
  async getServiceById(serviceId) {
    const response = await api.get(`/api/services/${serviceId}`);
    return response.data;
  },
};

export default serviceApi;
