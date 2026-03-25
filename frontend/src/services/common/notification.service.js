import { notificationApi } from './notification.api';

// Sends emails and SMS messages through the common service
export const notificationService = {
  async sendEmail(to, subject, text, html) {
    const { data } = await notificationApi.sendEmail({ to, subject, text, html });
    return data;
  },

  async sendSms(to, body) {
    const { data } = await notificationApi.sendSms({ to, body });
    return data;
  },
};
