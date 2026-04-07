import { doctorApi } from './doctor.api';

// Create and manage doctor profiles and their schedules
export const doctorService = {
  async create(payload) {
    const { data } = await doctorApi.create(payload);
    return data.doctor ?? data;
  },

  async list() {
    const { data } = await doctorApi.list();
    return data.doctors ?? data;
  },

  async getById(id) {
    const { data } = await doctorApi.getById(id);
    return data.doctor ?? data;
  },

  async update(id, payload) {
    const { data } = await doctorApi.update(id, payload);
    return data.doctor ?? data;
  },

  async remove(id) {
    await doctorApi.remove(id);
  },

  async updateSchedule(id, weekStartMonday, schedule) {
    const { data } = await doctorApi.updateSchedule(id, { weekStartMonday, schedule });
    return data.doctor ?? data;
  },

  async getAvailableSlots(id, weekStartMonday) {
    const { data } = await doctorApi.getAvailableSlots(id, weekStartMonday);
    return data;
  },

  async getReservedSlots(id, weekStartMonday) {
    const { data } = await doctorApi.getReservedSlots(id, weekStartMonday);
    return data;
  },

  async reserveSlot(id, slotId) {
    const { data } = await doctorApi.reserveSlot(id, slotId);
    return data;
  },

  async releaseSlot(id, slotId) {
    const { data } = await doctorApi.releaseSlot(id, slotId);
    return data;
  },

  async uploadPhoto(id, file) {
    const form = new FormData();
    form.append('photo', file);
    const { data } = await doctorApi.uploadPhoto(id, form);
    return data.doctor ?? data;
  },
};
