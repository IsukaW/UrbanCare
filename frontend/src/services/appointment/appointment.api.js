import { patientClient, commonClient } from '../../utils/httpClients';

export const appointmentApi = {
  book: (data) => patientClient.post('/appointments/book', data),
  list: (params) => patientClient.get('/appointments', { params }),
  getById: (id) => patientClient.get(`/appointments/${id}`),
  cancel: (id, reason) => patientClient.post(`/appointments/${id}/cancel`, { reason }),
  approveCancellation: (id, adminNotes) =>
    patientClient.put(`/appointments/${id}/approve-cancellation`, { adminNotes: adminNotes || '' }),
  listDoctors: (params) => patientClient.get('/doctors', { params }),
  getDoctorSlots: (doctorId, date) =>
    patientClient.get(`/doctors/${doctorId}/available-slots`, { params: { date } }),
  createPaymentIntent: (appointmentId, amount) =>
    commonClient.post('/payments/intent', { appointmentId, amount }),
  confirmPaymentIntent: (paymentIntentId, paymentMethod) =>
    commonClient.post(`/payments/intent/${paymentIntentId}/confirm`, { paymentMethod }),
  confirmPayment: (appointmentId, paymentIntentId) =>
    patientClient.post(`/appointments/${appointmentId}/confirm-payment`, { paymentIntentId }),
  update: (id, data) => patientClient.put(`/appointments/${id}`, data),
};