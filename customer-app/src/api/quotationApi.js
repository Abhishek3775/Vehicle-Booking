import api from './axiosInstance';

export const quotationApi = {
  /**
   * Retrieve all quotations associated with a booking
   * @param {string} bookingId
   */
  async getQuotationsByBookingId(bookingId) {
    const response = await api.get(`/api/quotations/booking/${bookingId}`);
    return response.data;
  },

  /**
   * Retrieve single quotation details by ID
   * @param {string} quotationId
   */
  async getQuotationById(quotationId) {
    const response = await api.get(`/api/quotations/${quotationId}`);
    return response.data;
  },

  /**
   * Customer approves quotation
   * @param {string} quotationId
   */
  async approveQuotation(quotationId) {
    const response = await api.patch(`/api/quotations/${quotationId}/approve`);
    return response.data;
  },

  /**
   * Customer rejects quotation with reason
   * @param {string} quotationId
   * @param {string} rejectionReason
   */
  async rejectQuotation(quotationId, rejectionReason) {
    const response = await api.patch(`/api/quotations/${quotationId}/reject`, {
      rejectionReason,
    });
    return response.data;
  },
};

export default quotationApi;
