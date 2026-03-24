import { doctorClient } from '../../utils/httpClients';

// Talks to the doctor service endpoints
export const doctorApi = {
  create: (data) => doctorClient.post('/doctors/', data),
  list: () => doctorClient.get('/doctors/'),
  getById: (id) => doctorClient.get(`/doctors/${id}`),
  updateSchedule: (id, schedule) => doctorClient.patch(`/doctors/${id}/schedule`, { schedule }),
};
