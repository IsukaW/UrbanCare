import { patientClient } from '../../utils/httpClients';

export const appointmentApi = {
  book: (data) => patientClient.post('/appointments/book', data),
  list: (params) => patientClient.get('/appointments', { params }),
  getById: (id) => patientClient.get(`/appointments/${id}`),
  cancel: (id, reason) => patientClient.post(`/appointments/${id}/cancel`, { reason }),
  listDoctors: (params) => patientClient.get('/doctors', { params }),
  getDoctorSlots: (doctorId, date) =>
    patientClient.get(`/doctors/${doctorId}/available-slots`, { params: { date } }),
};