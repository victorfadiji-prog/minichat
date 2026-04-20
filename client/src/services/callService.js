import api from './api';

/**
 * Call service — create, update, and fetch call records.
 */
const callService = {
  async getCallHistory() {
    const res = await api.get('/calls');
    return res.data;
  },

  async getCall(callId) {
    const res = await api.get(`/calls/${callId}`);
    return res.data;
  },

  async createCall({ participants, type, conversation, isGroup }) {
    const res = await api.post('/calls', { participants, type, conversation, isGroup });
    return res.data;
  },

  async updateCall(callId, { status, duration }) {
    const res = await api.put(`/calls/${callId}`, { status, duration });
    return res.data;
  },
};

export default callService;
