import api from './axiosInstance';

export const paymentApi = {
  /**
   * Create payment gateway order for an approved quotation
   * @param {object} payload - { quotationId, paymentMethod }
   */
  async createOrder({ quotationId, paymentMethod = 'RAZORPAY' }) {
    const response = await api.post('/api/payments/create-order', {
      quotationId,
      paymentMethod,
    });
    return response.data;
  },

  /**
   * Cryptographically verify gateway payment on backend and settle
   * @param {object} payload - { razorpay_order_id, razorpay_payment_id, razorpay_signature }
   */
  async verifyPayment(payload) {
    const response = await api.post('/api/payments/verify', payload);
    return response.data;
  },

  /**
   * Fetch payment details by ID
   * @param {string} paymentId
   */
  async getPaymentById(paymentId) {
    const response = await api.get(`/api/payments/${paymentId}`);
    return response.data;
  },

  /**
   * Fetch payment history for a specific booking
   * @param {string} bookingId
   */
  async getPaymentsByBookingId(bookingId) {
    const response = await api.get(`/api/payments/booking/${bookingId}`);
    return response.data;
  },
};

export default paymentApi;
