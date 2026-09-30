import api from './api';

export const adminApi = {
  // Admin Profile
  getProfile: async () => {
    const response = await api.get('/admin/profile');
    return response.data;
  },

  updateProfile: async (payload) => {
    const response = await api.put('/admin/profile', payload);
    return response.data;
  },

  // Dashboard & Analytics
  getDashboardSummary: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  getBookingAnalytics: async (params = {}) => {
    const response = await api.get('/admin/dashboard/bookings', { params });
    return response.data;
  },

  getRevenueAnalytics: async (params = {}) => {
    const response = await api.get('/admin/dashboard/revenue', { params });
    return response.data;
  },

  getMechanicsAnalytics: async () => {
    const response = await api.get('/admin/dashboard/mechanics');
    return response.data;
  },

  // Global Categorized Search
  globalSearch: async (q) => {
    const response = await api.get('/admin/search', { params: { q } });
    return response.data;
  },

  // Users Management
  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  getUserById: async (userId) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  updateUserStatus: async (userId, payload) => {
    const response = await api.patch(`/admin/users/${userId}/status`, payload);
    return response.data;
  },

  // Mechanics Management
  getMechanics: async (params = {}) => {
    const response = await api.get('/admin/mechanics', { params });
    return response.data;
  },

  getMechanicById: async (mechanicId) => {
    const response = await api.get(`/admin/mechanics/${mechanicId}`);
    return response.data;
  },

  updateMechanicVerification: async (mechanicId, payload) => {
    const response = await api.patch(`/admin/mechanics/${mechanicId}/verification`, payload);
    return response.data;
  },

  // Bookings Management
  getBookings: async (params = {}) => {
    const response = await api.get('/admin/bookings', { params });
    return response.data;
  },

  getBookingById: async (bookingId) => {
    const response = await api.get(`/admin/bookings/${bookingId}`);
    return response.data;
  },

  cancelBooking: async (bookingId, payload) => {
    const response = await api.patch(`/admin/bookings/${bookingId}/cancel`, payload);
    return response.data;
  },

  // Audit Logs
  getAuditLogs: async (params = {}) => {
    const response = await api.get('/admin/audit-logs', { params });
    return response.data;
  },
};
