import api from './api';

export const packagesApi = {
  getPackages: async (params = {}) => {
    const response = await api.get('/service-packages', { params });
    return response.data;
  },

  getPackageById: async (packageId) => {
    const response = await api.get(`/service-packages/${packageId}`);
    return response.data;
  },

  createPackage: async (payload) => {
    const response = await api.post('/service-packages', payload);
    return response.data;
  },

  updatePackage: async (packageId, payload) => {
    const response = await api.put(`/service-packages/${packageId}`, payload);
    return response.data;
  },

  updatePackageStatus: async (packageId, status) => {
    const response = await api.patch(`/service-packages/${packageId}/status`, { status });
    return response.data;
  },

  deletePackage: async (packageId) => {
    const response = await api.delete(`/service-packages/${packageId}`);
    return response.data;
  },
};
