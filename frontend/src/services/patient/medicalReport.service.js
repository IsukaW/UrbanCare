import { medicalReportApi } from './medicalReport.api';

export const medicalReportService = {
  async upload(patientId, file, meta = {}) {
    const { data } = await medicalReportApi.upload(patientId, file, meta);
    return data;
  },

  async list(patientId, params = {}) {
    const { data } = await medicalReportApi.list(patientId, params);
    // Common service returns { data: [...], pagination: {...} }
    return Array.isArray(data) ? data : (data.data ?? []);
  },

  async getViewUrl(patientId, docId) {
    return medicalReportApi.getViewUrl(patientId, docId);
  },

  async download(patientId, docId, originalName) {
    return medicalReportApi.download(patientId, docId, originalName);
  },

  async remove(patientId, docId) {
    await medicalReportApi.remove(patientId, docId);
  },
};
