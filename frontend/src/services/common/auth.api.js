import { commonClient } from '../../utils/httpClients';

// Talks directly to the auth endpoints on the common service
export const authApi = {
  register: (data) => commonClient.post('/auth/register', data),
  login: (credentials) => commonClient.post('/auth/login', credentials),
};
