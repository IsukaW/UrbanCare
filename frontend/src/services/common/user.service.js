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
};
