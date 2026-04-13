import { patientClient } from '../../utils/httpClients';

// Talks to the patient service endpoints
export const patientApi = {
  create: (data) => patientClient.post('/patients/', data),
  getById: (id) => patientClient.get(`/patients/${id}`),
  update: (id, data) => patientClient.patch(`/patients/${id}`, data),
  addHistory: (id, record) => patientClient.patch(`/patients/${id}/history`, record),
  analyseSymptoms: (payload) => patientClient.post('/symptoms/analyse', payload),
};
