import api from './api.js';

const unwrap = (response) => response.data.data.user;

export const register = (values) => api.post('/api/auth/register', values).then(unwrap);
export const login = (values) => api.post('/api/auth/login', values).then(unwrap);
export const logout = () => api.post('/api/auth/logout');
export const getCurrentUser = () => api.get('/api/auth/me').then(unwrap);
export const forgotPassword = (values) => api.post('/api/auth/forgot-password', values);
export const resetPassword = (token, values) => api.post(`/api/auth/reset-password/${token}`, values);
