import api from './axios';

export const getNearbyRequests = (params) => api.get('/requests', { params });
export const getMyRequests     = ()       => api.get('/requests/mine');
export const createRequest     = (data)   => api.post('/requests', data);
export const deleteRequest     = (id)     => api.delete(`/requests/${id}`);
