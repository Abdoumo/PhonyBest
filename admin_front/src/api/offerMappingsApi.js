import axiosInstance from './axios';

export const offerMappingsApi = {
  getOfferMappings: async () => {
    const response = await axiosInstance.get('/admin/offer-mappings');
    return response.data;
  },
  
  createOfferMapping: async (data) => {
    const response = await axiosInstance.post('/admin/offer-mappings', data);
    return response.data;
  },
  
  updateOfferMapping: async (id, data) => {
    const response = await axiosInstance.put(`/admin/offer-mappings/${id}`, data);
    return response.data;
  },
  
  deleteOfferMapping: async (id) => {
    const response = await axiosInstance.delete(`/admin/offer-mappings/${id}`);
    return response.data;
  }
};
