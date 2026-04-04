import { commonClient } from '../../utils/httpClients';

// Talks to the user endpoints on the common service
export const userApi = {
  getById: (id) => commonClient.get(`/users/${id}`),
  update: (id, data) => commonClient.patch(`/users/${id}`, data),
  list: (params = {}) => commonClient.get('/users', { params }),
  approve: (id) => commonClient.post(`/users/${id}/approve`),
  reject: (id, message) => commonClient.post(`/users/${id}/reject`, { message }),
};
