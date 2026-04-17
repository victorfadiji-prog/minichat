import axios from 'axios';

/**
 * Axios instance with base URL and interceptors.
 * Automatically attaches JWT token to all requests.
 */
const API_URL = 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('minichat_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('minichat_token');
      localStorage.removeItem('minichat_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_URL };
