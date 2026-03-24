import { commonClient } from '../../utils/httpClients';

// Talks to the notification endpoints on the common service
export const notificationApi = {
  sendEmail: (data) => commonClient.post('/notify/email', data),
  sendSms: (data) => commonClient.post('/notify/sms', data),
};
