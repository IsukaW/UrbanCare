import { patientApi } from './patient.api';

// Create and manage patient profiles and medical history
export const patientService = {
  async create(payload) {
    const { data } = await patientApi.create(payload);
    return data.patient ?? data;
  },

  async getById(id) {
    const { data } = await patientApi.getById(id);
    return data.patient ?? data;
  },

  async addHistory(id, record) {
    const { data } = await patientApi.addHistory(id, record);
    return data.patient ?? data;
  },

  async analyseSymptoms(symptoms) {
    const { data } = await patientApi.analyseSymptoms(symptoms);
    return data;
  },
};
