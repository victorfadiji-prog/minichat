const mongoose = require('mongoose');

/**
 * Call Schema
 * Stores history of calls (1-on-1 and Group).
 */
const callSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    type: {
      type: String,
      enum: ['audio', 'video'],
      default: 'audio',
    },
    status: {
      type: String,
      enum: ['completed', 'missed', 'rejected', 'busy', 'ongoing'],
      default: 'ongoing',
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for performance
callSchema.index({ participants: 1, startedAt: -1 });

module.exports = mongoose.model('Call', callSchema);
