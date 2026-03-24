import { appointmentClient } from '../../utils/httpClients';

// Talks to the appointment service endpoints
export const appointmentApi = {
  create: (data) => appointmentClient.post('/appointments/', data),
  getById: (id) => appointmentClient.get(`/appointments/${id}`),
  update: (id, data) => appointmentClient.patch(`/appointments/${id}`, data),
  cancel: (id) => appointmentClient.delete(`/appointments/${id}`),
};
