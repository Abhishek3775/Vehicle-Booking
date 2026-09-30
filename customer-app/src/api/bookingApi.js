import api from './axiosInstance';

export const bookingApi = {
  /**
   * Create a new service or emergency booking
   * @param {object} bookingData
   */
  async createBooking(bookingData) {
    const response = await api.post('/api/bookings', bookingData);
    return response.data;
  },

  /**
   * Retrieve list of customer's bookings
   * @param {object} params - { status, bookingType, page, limit }
   */
  async getUserBookings(params = {}) {
    const response = await api.get('/api/bookings', { params });
    return response.data;
  },

  /**
   * Retrieve single booking details by ID
   * @param {string} bookingId
   */
  async getBookingById(bookingId) {
    const response = await api.get(`/api/bookings/${bookingId}`);
    return response.data;
  },

  /**
   * Cancel an eligible booking
   * @param {string} bookingId
   * @param {string} cancellationReason
   */
  async cancelBooking(bookingId, cancellationReason) {
    const response = await api.patch(`/api/bookings/${bookingId}/cancel`, {
      cancellationReason,
    });
    return response.data;
  },
};

export default bookingApi;
