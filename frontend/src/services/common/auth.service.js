import { authApi } from './auth.api';
import { tokenUtil } from '../../utils/token';

// Handles login/register logic and keeps the token saved
export const authService = {
  // Register a new account. Doctors/patients get status=pending — no token is returned.
  async register(payload) {
    const { data } = await authApi.register(payload);
    if (data.token) {
      tokenUtil.setToken(data.token);
      tokenUtil.setUser(data.user);
    }
    return data;
  },

  // Sign in and persist the token so the user stays logged in
  async login(credentials) {
    const { data } = await authApi.login(credentials);
    tokenUtil.setToken(data.token);
    tokenUtil.setUser(data.user);
    return data;
  },

  // Wipe the saved token and user on logout
  logout() {
    tokenUtil.clear();
  },

  // Grab whoever was last logged in from storage
  getStoredUser() {
    return tokenUtil.getUser();
  },

  isAuthenticated() {
    return !!tokenUtil.getToken();
  },
};
