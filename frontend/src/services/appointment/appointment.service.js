import { appointmentApi } from './appointment.api';

export const appointmentService = {
  async book(payload) {
    const { data } = await appointmentApi.book(payload);
    return data.appointment ?? data;
  },

  async list(params) {
    const { data } = await appointmentApi.list(params);
    // Support paginated { appointments, pagination } and legacy plain array
    if (data && data.appointments !== undefined) {
      return { appointments: data.appointments, pagination: data.pagination };
    }
    return { appointments: Array.isArray(data) ? data : [], pagination: null };
  },

  async getById(id) {
    const { data } = await appointmentApi.getById(id);
    return data.appointment ?? data;
  },

  async cancel(id, reason) {
    const { data } = await appointmentApi.cancel(id, reason);
    return data;
  },

  async listDoctors(specialty) {
    const { data } = await appointmentApi.listDoctors(
      specialty ? { specialty } : undefined
    );
    return Array.isArray(data) ? data : [];
  },

  async getDoctorSlots(doctorId, date) {
    const { data } = await appointmentApi.getDoctorSlots(doctorId, date);
    return data;
  },

  async createPaymentIntent(appointmentId, amount = 500) {
    const { data } = await appointmentApi.createPaymentIntent(appointmentId, amount);
    return data.data; // unwrap: { message, data: { paymentIntentId, clientSecret, ... } }
  },

  async confirmPaymentIntent(paymentIntentId, paymentMethod = 'pm_card_visa') {
    const { data } = await appointmentApi.confirmPaymentIntent(paymentIntentId, paymentMethod);
    return data.data ?? data;
  },

  async confirmPayment(appointmentId, paymentIntentId) {
    const { data } = await appointmentApi.confirmPayment(appointmentId, paymentIntentId);
    return data.appointment ?? data;
  },

  async update(id, payload) {
    const { data } = await appointmentApi.update(id, payload);
    return data.appointment ?? data;
  },

  async approveCancellation(id, adminNotes) {
    const { data } = await appointmentApi.approveCancellation(id, adminNotes);
    return data.appointment ?? data;
  },
};