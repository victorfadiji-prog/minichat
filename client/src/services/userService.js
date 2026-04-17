import api from './api';

/**
 * User service — search and profile operations.
 */
const userService = {
  async searchUsers(query) {
    const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  async getUserById(userId) {
    const res = await api.get(`/users/${userId}`);
    return res.data;
  },

  async updateProfile(userId, data) {
    const res = await api.put(`/users/${userId}`, data);
    return res.data;
  },

  async getContacts() {
    const res = await api.get('/users/contacts');
    return res.data;
  },

  async addContact(userId) {
    const res = await api.post(`/users/contacts/${userId}`);
    return res.data;
  },

  async removeContact(userId) {
    const res = await api.delete(`/users/contacts/${userId}`);
    return res.data;
  },

  async findUserByEmail(email) {
    const res = await api.get(`/users/find?email=${encodeURIComponent(email)}`);
    return res.data;
  },

  async addExternalContact(email, name) {
    const res = await api.post('/users/external-contacts', { email, name });
    return res.data;
  },

  async removeExternalContact(email) {
    const res = await api.delete(`/users/external-contacts/${encodeURIComponent(email)}`);
    return res.data;
  },
};

export default userService;
