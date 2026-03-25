import { commonClient } from '../../utils/httpClients';

// Talks to the user endpoints on the common service
export const userApi = {
  getById: (id) => commonClient.get(`/users/${id}`),
  update: (id, data) => commonClient.patch(`/users/${id}`, data),
};
