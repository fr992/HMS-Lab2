import axios from 'axios';
import { clearSession, getAccessToken } from '../auth/session';

const apiClient = axios.create({
  baseURL: 'https://localhost:7297/api',
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url ?? '');
    if (
      status === 401 &&
      !url.includes('/auth/login') &&
      !url.includes('/auth/refresh')
    ) {
      clearSession();
      window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

export default apiClient;