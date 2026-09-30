import api from './api';

export const invoicesApi = {
  getInvoices: async (params = {}) => {
    const response = await api.get('/invoices', { params });
    return response.data;
  },

  getInvoiceById: async (invoiceId) => {
    const response = await api.get(`/invoices/${invoiceId}`);
    return response.data;
  },

  getInvoiceByNumber: async (invoiceNumber) => {
    const response = await api.get(`/invoices/number/${invoiceNumber}`);
    return response.data;
  },

  cancelInvoice: async (invoiceId, cancellationReason) => {
    const response = await api.patch(`/invoices/${invoiceId}/cancel`, { cancellationReason });
    return response.data;
  },
};
