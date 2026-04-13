import { commonClient } from '../../utils/httpClients';

// Talks directly to the auth endpoints on the common service
export const authApi = {
  register: (data) => commonClient.post('/auth/register', data),
  login: (credentials) => commonClient.post('/auth/login', credentials),
  forgotPassword: (email) => commonClient.post('/auth/forgot-password', { email }),
  verifyCode: (email, code) => commonClient.post('/auth/verify-code', { email, code }),
  resetPassword: (resetToken, newPassword) =>
    commonClient.post('/auth/reset-password', { resetToken, newPassword }),
};
