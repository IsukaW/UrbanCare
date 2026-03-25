import { paymentApi } from './payment.api';

// Creates, retrieves, and confirms Stripe payment intents
export const paymentService = {
  async createIntent(payload) {
    const { data } = await paymentApi.createIntent(payload);
    return data;
  },

  async getIntent(id) {
    const { data } = await paymentApi.getIntent(id);
    return data;
  },

  async confirmIntent(id, paymentMethod) {
    const { data } = await paymentApi.confirmIntent(id, { paymentMethod });
    return data;
  },
};
