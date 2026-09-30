import api from './axiosInstance';

export const inspectionApi = {
  /**
   * Retrieve the latest inspection for a booking
   * @param {string} bookingId
   */
  async getInspectionByBookingId(bookingId) {
    const response = await api.get(`/api/inspections/booking/${bookingId}`);
    return response.data;
  },

  /**
   * Retrieve single inspection details by ID
   * @param {string} inspectionId
   */
  async getInspectionById(inspectionId) {
    const response = await api.get(`/api/inspections/${inspectionId}`);
    return response.data;
  },

  /**
   * Customer acknowledges viewing completed inspection report
   * @param {string} inspectionId
   */
  async acknowledgeInspection(inspectionId) {
    const response = await api.patch(`/api/inspections/${inspectionId}/acknowledge`);
    return response.data;
  },
};

export default inspectionApi;
