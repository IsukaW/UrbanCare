import { appointmentApi } from './appointment.api';

// Book, view, update, and cancel appointments
export const appointmentService = {
  async create(payload) {
    const { data } = await appointmentApi.create(payload);
    return data.appointment ?? data;
  },

  async getById(id) {
    const { data } = await appointmentApi.getById(id);
    return data.appointment ?? data;
  },

  async update(id, payload) {
    const { data } = await appointmentApi.update(id, payload);
    return data.appointment ?? data;
  },

  async cancel(id) {
    await appointmentApi.cancel(id);
  },
};
