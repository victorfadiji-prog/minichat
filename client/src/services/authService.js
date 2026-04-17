import api from './api';

/**
 * Authentication service — register, login, logout.
 */
const authService = {
  async register(username, email, password) {
    const res = await api.post('/auth/register', { username, email, password });
    if (res.data.success) {
      localStorage.setItem('minichat_token', res.data.token);
      localStorage.setItem('minichat_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      localStorage.setItem('minichat_token', res.data.token);
      localStorage.setItem('minichat_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore — we're logging out anyway
    }
    localStorage.removeItem('minichat_token');
    localStorage.removeItem('minichat_user');
  },

  async getMe() {
    const res = await api.get('/auth/me');
    return res.data;
  },

  getToken() {
    return localStorage.getItem('minichat_token');
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('minichat_user'));
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return !!localStorage.getItem('minichat_token');
  },
};

export default authService;
