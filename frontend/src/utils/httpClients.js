import axios from 'axios';
import { tokenUtil } from '../utils/token';

const createClient = (baseURL) => {
  const client = axios.create({ baseURL, timeout: 15000 });

  // Add the auth token to every request if the user is logged in
  client.interceptors.request.use((config) => {
    const token = tokenUtil.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Pull out the exact message the backend sent back.
  // The backend always returns { message: "..." } for errors, so we use that first.
  client.interceptors.response.use(
    (res) => res,
    (err) => {
      // Prefer the backend's own message — it's already human-readable
      const serverMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        null;

      // Fall back to Axios's own message only when the server sent nothing useful
      const finalMessage = serverMessage || err.message || 'Something went wrong. Please try again.';

      // Only redirect when the user already had a token (session expired).
      // Don't redirect on 401 during login — that's just wrong credentials.
      if (err.response?.status === 401 && tokenUtil.getToken()) {
        tokenUtil.clear();
        window.location.href = '/login';
      }

      return Promise.reject(new Error(finalMessage));
    }
  );

  return client;
};

export const commonClient = createClient(
  import.meta.env.VITE_COMMON_BASE_URL
);

export const appointmentClient = createClient(
  import.meta.env.VITE_APPOINTMENT_BASE_URL
);

export const doctorClient = createClient(
  import.meta.env.VITE_DOCTOR_BASE_URL
);

export const patientClient = createClient(
  import.meta.env.VITE_PATIENT_BASE_URL
);
