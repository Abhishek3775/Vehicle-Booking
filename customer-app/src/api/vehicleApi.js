import api from './axiosInstance';

export const vehicleApi = {
  /**
   * Retrieve all active vehicles belonging to authenticated user
   */
  async getVehicles() {
    const response = await api.get('/api/vehicles');
    return response.data;
  },

  /**
   * Retrieve single vehicle by ID
   * @param {string} vehicleId
   */
  async getVehicleById(vehicleId) {
    const response = await api.get(`/api/vehicles/${vehicleId}`);
    return response.data;
  },

  /**
   * Add a new vehicle
   * @param {object} vehicleData
   */
  async addVehicle(vehicleData) {
    const response = await api.post('/api/vehicles', vehicleData);
    return response.data;
  },

  /**
   * Update an existing vehicle
   * @param {string} vehicleId
   * @param {object} vehicleData
   */
  async updateVehicle(vehicleId, vehicleData) {
    const response = await api.put(`/api/vehicles/${vehicleId}`, vehicleData);
    return response.data;
  },

  /**
   * Soft-delete / deactivate vehicle
   * @param {string} vehicleId
   */
  async deleteVehicle(vehicleId) {
    const response = await api.delete(`/api/vehicles/${vehicleId}`);
    return response.data;
  },

  /**
   * Set vehicle as default
   * @param {string} vehicleId
   */
  async setDefaultVehicle(vehicleId) {
    const response = await api.patch(`/api/vehicles/${vehicleId}/default`);
    return response.data;
  },
};

export default vehicleApi;
