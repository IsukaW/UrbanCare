import { appointmentApi } from './appointment.api';

export const appointmentService = {
  async book(payload) {
    const { data } = await appointmentApi.book(payload);
    return data.appointment ?? data;
  },

  async list(params) {
    const { data } = await appointmentApi.list(params);
    return Array.isArray(data) ? data : data.appointments ?? [];
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
};