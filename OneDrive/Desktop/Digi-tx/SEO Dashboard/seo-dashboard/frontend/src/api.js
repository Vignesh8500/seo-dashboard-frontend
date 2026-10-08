import axios from 'axios';

export const TOKEN_KEY = 'seo-dashboard-token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
});

// Attach the token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the server says the session is invalid, clear it and tell the app
api.interceptors.response.use(
  res => res,
  err => {
    const isLoginCall = err.config?.url?.includes('/api/auth/login');
    if (err.response?.status === 401 && !isLoginCall) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(err);
  }
);

export default api;