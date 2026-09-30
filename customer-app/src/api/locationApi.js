import api from './axiosInstance';

export const locationApi = {
  /**
   * Update customer current geographic coordinates
   * @param {object} locationData - { latitude, longitude, addressText }
   */
  async updateCurrentLocation({ latitude, longitude, addressText }) {
    const response = await api.post('/api/locations/current', {
      latitude,
      longitude,
      addressText,
    });
    return response.data;
  },

  /**
   * Retrieve customer current location
   */
  async getCurrentLocation() {
    const response = await api.get('/api/locations/current');
    return response.data;
  },

  /**
   * Calculate straight-line Haversine distance between coordinates
   * @param {object} coords - { origin: { latitude, longitude }, destination: { latitude, longitude } }
   */
  async calculateDistance({ origin, destination }) {
    const response = await api.post('/api/locations/distance', {
      origin,
      destination,
    });
    return response.data;
  },
};

export default locationApi;
