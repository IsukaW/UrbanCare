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

  async updateSchedule(id, schedule) {
    const { data } = await doctorApi.updateSchedule(id, schedule);
    return data.doctor ?? data;
  },

  async uploadPhoto(id, file) {
    const form = new FormData();
    form.append('photo', file);
    const { data } = await doctorApi.uploadPhoto(id, form);
    return data.doctor ?? data;
  },

  async uploadPhoto(id, file) {
    const form = new FormData();
    form.append('photo', file);
    const { data } = await doctorApi.uploadPhoto(id, form);
    return data.doctor ?? data;
  },
};
