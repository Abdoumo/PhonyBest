import axiosInstance from './axios';

export const offerMappingsApi = {
  getOfferMappings: async () => {
    const response = await axiosInstance.get('/admin/offer-mappings');
    return response.data;
  },

  getOfferCatalog: async () => {
    const response = await axiosInstance.get('/admin/offer-mappings/catalog');
    return response.data;
  },

  getNodeApis: async () => {
    const response = await axiosInstance.get('/admin/offer-mappings/node-apis');
    return response.data;
  },

  syncNodeApis: async (nodeId = null) => {
    const response = await axiosInstance.post('/admin/offer-mappings/sync-apis', { node_id: nodeId });
    return response.data;
  },

  getModemGridApis: async () => {
    const response = await axiosInstance.get('/admin/offer-mappings/modemgrid-apis');
    return response.data;
  },

  testApi: async (data) => {
    const response = await axiosInstance.post('/admin/offer-mappings/test-api', data);
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
