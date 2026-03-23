import api from './axios';

export const getListings    = (params) => api.get('/listings', { params });
export const getListingById = (id, params) => api.get(`/listings/${id}`, { params });
export const getMyListings  = () => api.get('/listings/mine');
export const getCategories  = () => api.get('/listings/categories');

export const createListing = (formData) =>
  api.post('/listings', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const updateListing    = (id, data) => api.put(`/listings/${id}`, data);
export const deactivateListing = (id)      => api.delete(`/listings/${id}`);

export const getNearbyListings = (params) =>
  api.get('/listings/nearby', { params });

export const getHeatmapData = () =>
  api.get('/listings/heatmap');

