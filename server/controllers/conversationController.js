const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

/**
 * GET /api/conversations
 * Get all conversations for the current user, sorted by most recent.
 */
exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'username avatar status lastSeen')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    // Add unread count for current user
    const conversationsWithUnread = conversations.map((conv) => {
      const convObj = conv.toObject();
      convObj.unreadCount = conv.unreadCount?.get(req.user._id.toString()) || 0;
      return convObj;
    });

    res.status(200).json({
      success: true,
      conversations: conversationsWithUnread,
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching conversations',
    });
  }
};

/**
 * POST /api/conversations
 * Create a new conversation or return existing one.
 * Body: { participantId } for private, { participantIds, groupName } for group.
 */
exports.createConversation = async (req, res) => {
  try {
    const { participantId, participantIds, groupName, type } = req.body;

    // Private conversation
    if (!type || type === 'private') {
      if (!participantId) {
        return res.status(400).json({
          success: false,
          message: 'participantId is required for private chats',
        });
      }

      // Check if a private conversation already exists between these two users
      const existingConversation = await Conversation.findOne({
        type: 'private',
        participants: {
          $all: [req.user._id, participantId],
          $size: 2,
        },
      })
        .populate('participants', 'username avatar status lastSeen')
        .populate('lastMessage');

      if (existingConversation) {
        return res.status(200).json({
          success: true,
          conversation: existingConversation,
          isNew: false,
        });
      }

      // Create new private conversation
      const conversation = await Conversation.create({
        type: 'private',
        participants: [req.user._id, participantId],
      });

      const populated = await Conversation.findById(conversation._id)
        .populate('participants', 'username avatar status lastSeen')
        .populate('lastMessage');

      return res.status(201).json({
        success: true,
        conversation: populated,
        isNew: true,
      });
    }

    // Group conversation
    if (type === 'group') {
      if (!participantIds || participantIds.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'At least 2 other participants are required for a group',
        });
      }

      const allParticipants = [
        req.user._id,
        ...participantIds.filter(
          (id) => id.toString() !== req.user._id.toString()
        ),
      ];

      const conversation = await Conversation.create({
        type: 'group',
        participants: allParticipants,
        groupName: groupName || 'New Group',
        admin: req.user._id,
      });

      const populated = await Conversation.findById(conversation._id)
        .populate('participants', 'username avatar status lastSeen')
        .populate('lastMessage');

      // Create a system message for group creation
      const systemMsg = await Message.create({
        conversation: conversation._id,
        sender: req.user._id,
        content: `${req.user.username} created the group "${groupName || 'New Group'}"`,
        type: 'system',
      });

      populated.lastMessage = systemMsg;
      await populated.save();

      return res.status(201).json({
        success: true,
        conversation: populated,
        isNew: true,
      });
    }
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating conversation',
    });
  }
};

/**
 * GET /api/conversations/:id/messages
 * Get messages for a conversation with pagination.
 */
exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verify user is a participant
    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const messages = await Message.find({
      conversation: id,
      deletedFor: { $ne: req.user._id },
    })
      .populate('sender', 'username avatar')
      .populate('replyTo', 'content sender type')
      .populate('reactions.user', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({
      conversation: id,
      deletedFor: { $ne: req.user._id },
    });

    res.status(200).json({
      success: true,
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching messages',
    });
  }
};

/**
 * PUT /api/conversations/:id/read
 * Mark all messages in a conversation as read by current user.
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    // Update all unread messages in this conversation
    await Message.updateMany(
      {
        conversation: id,
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      {
        $addToSet: { readBy: req.user._id },
        $set: { status: 'read' },
      }
    );

    // Reset unread count
    await Conversation.findByIdAndUpdate(id, {
      [`unreadCount.${req.user._id}`]: 0,
    });

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * PUT /api/conversations/:id/participants
 * Add new participants to a group.
 */
exports.addParticipants = async (req, res) => {
  try {
    const { id } = req.params;
    const { participantIds } = req.body;

    if (!participantIds || participantIds.length === 0) {
      return res.status(400).json({ success: false, message: 'participantIds are required' });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Verify current user is admin
    if (conversation.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only admins can add participants' });
    }

    // Add unique participants
    const newParticipants = participantIds.filter(
      (pid) => !conversation.participants.includes(pid)
    );

    if (newParticipants.length === 0) {
      return res.status(400).json({ success: false, message: 'All users are already in the group' });
    }

    conversation.participants.push(...newParticipants);
    await conversation.save();

    // Create system message
    const users = await User.find({ _id: { $in: newParticipants } }).select('username');
    const userNames = users.map((u) => u.username).join(', ');
    await Message.create({
      conversation: id,
      sender: req.user._id,
      content: `${req.user.username} added ${userNames}`,
      type: 'system',
    });

    const populated = await Conversation.findById(id)
      .populate('participants', 'username avatar status lastSeen')
      .populate('lastMessage');

    res.status(200).json({ success: true, conversation: populated });
  } catch (error) {
    console.error('Add participants error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * DELETE /api/conversations/:id/participants/:userId
 * Remove a participant from a group.
 */
exports.removeParticipant = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const conversation = await Conversation.findById(id);
    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Verify current user is admin
    if (conversation.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only admins can remove participants' });
    }

    if (userId === conversation.admin.toString()) {
      return res.status(400).json({ success: false, message: 'Admin cannot be removed' });
    }

    conversation.participants = conversation.participants.filter(
      (pid) => pid.toString() !== userId
    );
    await conversation.save();

    // Create system message
    const removedUser = await User.findById(userId).select('username');
    await Message.create({
      conversation: id,
      sender: req.user._id,
      content: `${req.user.username} removed ${removedUser.username}`,
      type: 'system',
    });

    const populated = await Conversation.findById(id)
      .populate('participants', 'username avatar status lastSeen')
      .populate('lastMessage');

    res.status(200).json({ success: true, conversation: populated });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * DELETE /api/conversations/:id/leave
 * Leave a group conversation.
 */
exports.leaveConversation = async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findById(id);
    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    conversation.participants = conversation.participants.filter(
      (pid) => pid.toString() !== req.user._id.toString()
    );

    // If admin is leaving and there are other members, assign new admin
    if (
      conversation.admin.toString() === req.user._id.toString() &&
      conversation.participants.length > 0
    ) {
      conversation.admin = conversation.participants[0];
    }

    await conversation.save();

    // Create system message
    await Message.create({
      conversation: id,
      sender: req.user._id,
      content: `${req.user.username} left the group`,
      type: 'system',
    });

    res.status(200).json({ success: true, message: 'Left group successfully' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
