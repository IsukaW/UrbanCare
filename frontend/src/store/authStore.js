import { create } from 'zustand';
import { tokenUtil } from '../utils/token';

// Keeps the logged-in user and token in memory.
// On page reload these are restored from localStorage so the user stays signed in.
const useAuthStore = create((set) => ({
  token: tokenUtil.getToken(),
  user: tokenUtil.getUser(), // the currently logged-in user

  setAuth: (token, user) => {
    tokenUtil.setToken(token);
    tokenUtil.setUser(user);
    set({ token, user });
  },

  clearAuth: () => {
    tokenUtil.clear();
    set({ token: null, user: null });
  },
}));

export default useAuthStore;
