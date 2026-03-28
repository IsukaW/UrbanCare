import { authApi } from './auth.api';
import { doctorApi } from '../doctor/doctor.api';
import { tokenUtil } from '../../utils/token';

// Handles login/register logic and keeps the token saved
export const authService = {
  // Register a new account and save the returned token
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
    try {
      const { data } = await authApi.login(credentials);
      tokenUtil.setToken(data.token);
      tokenUtil.setUser(data.user);
      return data;
    } catch (primaryErr) {
      // Admin-created doctors live in doctor-service only (not common User collection)
      try {
        const { data } = await doctorApi.login(credentials);
        tokenUtil.setToken(data.token);
        tokenUtil.setUser(data.user);
        return data;
      } catch {
        throw primaryErr;
      }
    }
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
