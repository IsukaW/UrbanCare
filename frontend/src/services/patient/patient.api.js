import { patientClient } from '../../utils/httpClients';

// Talks to the patient service endpoints
export const patientApi = {
  create: (data) => patientClient.post('/patients/', data),
  getById: (id) => patientClient.get(`/patients/${id}`),
  addHistory: (id, record) => patientClient.patch(`/patients/${id}/history`, record),
};
