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

  // Pull out a readable error message from whatever the server sends back
  client.interceptors.response.use(
    (res) => res,
    (err) => {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Something went wrong';

      // Session expired or invalid token — kick the user back to login
      if (err.response?.status === 401) {
        tokenUtil.clear();
        window.location.href = '/login';
      }

      return Promise.reject(new Error(message));
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
