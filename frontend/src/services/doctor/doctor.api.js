import { doctorClient } from '../../utils/httpClients';

// Talks to the doctor service endpoints
export const doctorApi = {
  create: (data) => doctorClient.post('/doctors/', data),
  list: () => doctorClient.get('/doctors/'),
  getById: (id) => doctorClient.get(`/doctors/${id}`),
  update: (id, data) => doctorClient.patch(`/doctors/${id}`, data),
  remove: (id) => doctorClient.delete(`/doctors/${id}`),
  updateSchedule: (id, payload) => doctorClient.patch(`/doctors/${id}/schedule`, payload),
  uploadPhoto: (id, formData) =>
    doctorClient.post(`/doctors/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
