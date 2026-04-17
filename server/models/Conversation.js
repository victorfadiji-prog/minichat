const mongoose = require('mongoose');

/**
 * Conversation Schema
 * Represents a chat thread — either private (2 users) or group (multiple users).
 */
const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['private', 'group'],
      default: 'private',
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    groupName: {
      type: String,
      default: '',
      maxlength: [50, 'Group name must be at most 50 characters'],
    },
    groupAvatar: {
      type: String,
      default: '',
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding conversations by participant
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
