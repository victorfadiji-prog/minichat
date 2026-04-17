const express = require('express');
const router = express.Router();
const {
  getConversations,
  createConversation,
  getMessages,
  markAsRead,
  addParticipants,
  removeParticipant,
  leaveConversation,
} = require('../controllers/conversationController');
const { protect } = require('../middleware/auth');

/**
 * Conversation Routes — all protected
 */

// GET /api/conversations
router.get('/', protect, getConversations);

// POST /api/conversations
router.post('/', protect, createConversation);

// GET /api/conversations/:id/messages
router.get('/:id/messages', protect, getMessages);

// PUT /api/conversations/:id/read
router.put('/:id/read', protect, markAsRead);

// PUT /api/conversations/:id/participants
router.put('/:id/participants', protect, addParticipants);

// DELETE /api/conversations/:id/participants/:userId
router.delete('/:id/participants/:userId', protect, removeParticipant);

// DELETE /api/conversations/:id/leave
router.delete('/:id/leave', protect, leaveConversation);

module.exports = router;
