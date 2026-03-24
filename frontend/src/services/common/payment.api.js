import { commonClient } from '../../utils/httpClients';

// Talks to the payment endpoints on the common service
export const paymentApi = {
  createIntent: (data) => commonClient.post('/payments/intent', data),
  getIntent: (id) => commonClient.get(`/payments/intent/${id}`),
  confirmIntent: (id, data) => commonClient.post(`/payments/intent/${id}/confirm`, data),
};
