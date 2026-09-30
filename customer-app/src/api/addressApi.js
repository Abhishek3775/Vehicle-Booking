import api from './axiosInstance';

export const addressApi = {
  /**
   * Retrieve all active saved addresses
   */
  async getAddresses() {
    const response = await api.get('/api/addresses');
    return response.data;
  },

  /**
   * Retrieve a single address by ID
   * @param {string} addressId
   */
  async getAddressById(addressId) {
    const response = await api.get(`/api/addresses/${addressId}`);
    return response.data;
  },

  /**
   * Add a new saved address
   * @param {object} addressData
   */
  async addAddress(addressData) {
    const response = await api.post('/api/addresses', addressData);
    return response.data;
  },

  /**
   * Update an existing address
   * @param {string} addressId
   * @param {object} addressData
   */
  async updateAddress(addressId, addressData) {
    const response = await api.put(`/api/addresses/${addressId}`, addressData);
    return response.data;
  },

  /**
   * Deactivate an address
   * @param {string} addressId
   */
  async deleteAddress(addressId) {
    const response = await api.delete(`/api/addresses/${addressId}`);
    return response.data;
  },

  /**
   * Set address as default
   * @param {string} addressId
   */
  async setDefaultAddress(addressId) {
    const response = await api.patch(`/api/addresses/${addressId}/default`);
    return response.data;
  },
};

export default addressApi;
