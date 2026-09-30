import api from './axiosInstance';

export const mechanicApi = {
  /**
   * Retrieve mechanic profile by ID
   * @param {string} mechanicId
   */
  async getMechanicById(mechanicId) {
    const response = await api.get(`/api/mechanics/${mechanicId}`);
    return response.data;
  },

  /**
   * Retrieve dispatch details associated with a booking
   * @param {string} bookingId
   */
  async getDispatchByBookingId(bookingId) {
    const response = await api.get(`/api/dispatch/booking/${bookingId}`);
    return response.data;
  },
};

export default mechanicApi;
