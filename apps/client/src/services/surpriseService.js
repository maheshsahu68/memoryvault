import api from './api.js';

const unwrapSurprise = (response) => response.data.data.surprise;

export const listSurprises = (params) => api.get('/api/surprises', { params }).then((response) => ({ ...response.data.data, meta: response.data.meta }));
export const getSurprise = (id) => api.get(`/api/surprises/${id}`).then(unwrapSurprise);
export const createSurprise = (values) => api.post('/api/surprises', values).then(unwrapSurprise);
export const updateSurprise = (id, values) => api.patch(`/api/surprises/${id}`, values).then(unwrapSurprise);
export const deleteSurprise = (id) => api.delete(`/api/surprises/${id}`);
export const duplicateSurprise = (id) => api.post(`/api/surprises/${id}/duplicate`).then(unwrapSurprise);
