import { userApi } from './user.api';

// Fetching and updating user profiles
export const userService = {
  async getById(id) {
    const { data } = await userApi.getById(id);
    return data.user ?? data;
  },

  async update(id, payload) {
    const { data } = await userApi.update(id, payload);
    return data.user ?? data;
  },

  async listAll(params = {}) {
    const { data } = await userApi.list(params);
    return data.users ?? data;
  },

  async approve(id) {
    const { data } = await userApi.approve(id);
    return data.user ?? data;
  },

  async reject(id, message) {
    const { data } = await userApi.reject(id, message);
    return data.user ?? data;
  },

  async delete(id) {
    const { data } = await userApi.delete(id);
    return data;
  },
};
