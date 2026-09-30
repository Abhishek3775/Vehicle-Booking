import api from './axiosInstance';

export const invoiceApi = {
  /**
   * Fetch customer's invoices list
   * @param {object} params - { page, limit, status }
   */
  async getInvoices(params = {}) {
    const response = await api.get('/api/invoices', { params });
    return response.data;
  },

  /**
   * Fetch single invoice details by ID
   * @param {string} invoiceId
   */
  async getInvoiceById(invoiceId) {
    const response = await api.get(`/api/invoices/${invoiceId}`);
    return response.data;
  },

  /**
   * Fetch invoice history for a specific booking
   * @param {string} bookingId
   */
  async getInvoicesByBookingId(bookingId) {
    const response = await api.get(`/api/invoices/booking/${bookingId}`);
    return response.data;
  },

  /**
   * Generate permanent billing invoice from successful payment
   * @param {object} payload - { paymentId, notes }
   */
  async generateInvoice(payload) {
    const response = await api.post('/api/invoices/generate', payload);
    return response.data;
  },
};

export default invoiceApi;
