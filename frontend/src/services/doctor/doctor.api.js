import { doctorClient } from '../../utils/httpClients';

// Talks to the doctor service endpoints
export const doctorApi = {
  login: (credentials) => doctorClient.post('/doctors/login', credentials),
  create: (data) => doctorClient.post('/doctors/', data),
  list: () => doctorClient.get('/doctors/'),
  getById: (id) => doctorClient.get(`/doctors/${id}`),
  update: (id, data) => doctorClient.patch(`/doctors/${id}`, data),
  remove: (id) => doctorClient.delete(`/doctors/${id}`),
  updateSchedule: (id, schedule) => doctorClient.patch(`/doctors/${id}/schedule`, { schedule }),
};
