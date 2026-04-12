import { patientClient } from '../../utils/httpClients';

// Calls patient-service /patients/:patientId/documents endpoints.
// patientId is the patient document's MongoDB _id (obtained from the profile response).
export const medicalReportApi = {
  upload: (patientId, file, meta = {}) => {
    const form = new FormData();
    form.append('file', file);
    if (meta.category) form.append('category', meta.category);
    if (meta.description) form.append('description', meta.description);
    if (meta.appointmentId) form.append('appointmentId', meta.appointmentId);
    return patientClient.post(`/patients/${patientId}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  list: (patientId, params = {}) =>
    patientClient.get(`/patients/${patientId}/documents`, { params }),

  // Returns a blob Object URL for inline viewing (call URL.revokeObjectURL when done).
  getViewUrl: async (patientId, docId) => {
    const res = await patientClient.get(
      `/patients/${patientId}/documents/${docId}`,
      { responseType: 'blob' }
    );
    return URL.createObjectURL(res.data);
  },

  // Triggers a browser file download.
  download: async (patientId, docId, originalName) => {
    const res = await patientClient.get(
      `/patients/${patientId}/documents/${docId}/download`,
      { responseType: 'blob' }
    );
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = originalName || 'download';
    a.click();
    URL.revokeObjectURL(url);
  },

  remove: (patientId, docId) =>
    patientClient.delete(`/patients/${patientId}/documents/${docId}`),
};
