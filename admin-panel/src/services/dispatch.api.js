import api from './api';

export const dispatchApi = {
  getDispatchList: async (params = {}) => {
    const response = await api.get('/dispatch', { params });
    return response.data;
  },

  getDispatchById: async (dispatchId) => {
    const response = await api.get(`/dispatch/${dispatchId}`);
    return response.data;
  },

  assignDispatch: async (bookingId, payload = {}) => {
    const response = await api.post(`/dispatch/${bookingId}/assign`, payload);
    return response.data;
  },

  reassignDispatch: async (dispatchId, payload) => {
    const response = await api.patch(`/dispatch/${dispatchId}/reassign`, payload);
    return response.data;
  },

  cancelDispatch: async (dispatchId, payload = {}) => {
    const response = await api.patch(`/dispatch/${dispatchId}/cancel`, payload);
    return response.data;
  },
};
