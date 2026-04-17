import api from './api';

/**
 * Chat service — conversations and messages API.
 */
const chatService = {
  async getConversations() {
    const res = await api.get('/conversations');
    return res.data;
  },

  async createConversation(participantId) {
    const res = await api.post('/conversations', { participantId, type: 'private' });
    return res.data;
  },

  async createGroupConversation(participantIds, groupName) {
    const res = await api.post('/conversations', {
      participantIds,
      groupName,
      type: 'group',
    });
    return res.data;
  },

  async getMessages(conversationId, page = 1, limit = 50) {
    const res = await api.get(
      `/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    );
    return res.data;
  },

  async sendMessage(data) {
    const res = await api.post('/messages', data);
    return res.data;
  },

  async reactToMessage(messageId, emoji) {
    const res = await api.post(`/messages/${messageId}/react`, { emoji });
    return res.data;
  },

  async markAsRead(conversationId) {
    const res = await api.put(`/conversations/${conversationId}/read`);
    return res.data;
  },

  async editMessage(messageId, content) {
    const res = await api.put(`/messages/${messageId}`, { content });
    return res.data;
  },

  async deleteMessage(messageId, deleteType = 'me') {
    const res = await api.delete(`/messages/${messageId}?deleteType=${deleteType}`);
    return res.data;
  },

  async addParticipants(conversationId, participantIds) {
    const res = await api.put(`/conversations/${conversationId}/participants`, { participantIds });
    return res.data;
  },

  async removeParticipant(conversationId, userId) {
    const res = await api.delete(`/conversations/${conversationId}/participants/${userId}`);
    return res.data;
  },

  async leaveGroup(conversationId) {
    const res = await api.delete(`/conversations/${conversationId}/leave`);
    return res.data;
  },

  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

export default chatService;
