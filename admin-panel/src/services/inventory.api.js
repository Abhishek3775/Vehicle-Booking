import api from './api';

export const inventoryApi = {
  getParts: async (params = {}) => {
    const response = await api.get('/parts', { params });
    return response.data;
  },

  getPartById: async (partId) => {
    const response = await api.get(`/parts/${partId}`);
    return response.data;
  },

  createPart: async (payload) => {
    const response = await api.post('/parts', payload);
    return response.data;
  },

  updatePart: async (partId, payload) => {
    const response = await api.put(`/parts/${partId}`, payload);
    return response.data;
  },

  adjustStock: async (partId, payload) => {
    const response = await api.patch(`/parts/${partId}/stock`, payload);
    return response.data;
  },

  updatePartStatus: async (partId, status) => {
    const response = await api.patch(`/parts/${partId}/status`, { status });
    return response.data;
  },
};
