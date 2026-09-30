import api from './api';

export const servicesApi = {
  getServices: async (params = {}) => {
    const response = await api.get('/services', { params });
    return response.data;
  },

  getServiceById: async (serviceId) => {
    const response = await api.get(`/services/${serviceId}`);
    return response.data;
  },

  createService: async (payload) => {
    const response = await api.post('/services', payload);
    return response.data;
  },

  updateService: async (serviceId, payload) => {
    const response = await api.put(`/services/${serviceId}`, payload);
    return response.data;
  },

  updateServiceStatus: async (serviceId, status) => {
    const response = await api.patch(`/services/${serviceId}/status`, { status });
    return response.data;
  },
};
