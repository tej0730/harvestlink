import api from './axios';

export const placeOrder     = (data)      => api.post('/orders', data);
export const getOrders      = ()          => api.get('/orders');
export const getOrderById   = (id)        => api.get(`/orders/${id}`);
export const acceptOrder    = (id)        => api.patch(`/orders/${id}/accept`);
export const declineOrder   = (id, data)  => api.patch(`/orders/${id}/decline`, data);
export const markReady      = (id)        => api.patch(`/orders/${id}/ready`);
export const completeOrder  = (id)        => api.patch(`/orders/${id}/complete`);
export const cancelOrder    = (id, data)  => api.patch(`/orders/${id}/cancel`, data);
export const disputeOrder   = (id, data)  => api.patch(`/orders/${id}/dispute`, data);
export const confirmPayment = (id)        => api.patch(`/orders/${id}/payment`);

export const getNotifications = ()   => api.get('/notifications');
export const markAllRead      = ()   => api.patch('/notifications/read-all');
export const markOneRead      = (id) => api.patch(`/notifications/${id}/read`);

export const getMySlots     = ()     => api.get('/pickup-slots/mine');
export const getGrowerSlots = (gId)  => api.get(`/pickup-slots/grower/${gId}`);
export const createSlot     = (data) => api.post('/pickup-slots', data);
export const toggleSlot     = (id)   => api.patch(`/pickup-slots/${id}/toggle`);
export const deleteSlot     = (id)   => api.delete(`/pickup-slots/${id}`);
