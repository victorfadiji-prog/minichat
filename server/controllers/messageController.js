const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

/**
 * POST /api/messages
 * Send a new message.
 */
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, content, type, mediaUrl, fileName, fileSize, replyTo } = req.body;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'conversationId is required',
      });
    }

    // Verify user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // Create the message
    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      content: content || '',
      type: type || 'text',
      mediaUrl: mediaUrl || '',
      fileName: fileName || '',
      fileSize: fileSize || 0,
      replyTo: replyTo || null,
      readBy: [req.user._id], // Sender has read their own message
    });

    // Populate the message
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar')
      .populate('replyTo', 'content sender type');

    // Update conversation's last message and unread counts
    const updateData = {
      lastMessage: message._id,
    };

    // Increment unread count for all participants except sender
    for (const participantId of conversation.participants) {
      if (participantId.toString() !== req.user._id.toString()) {
        const currentCount =
          conversation.unreadCount?.get(participantId.toString()) || 0;
        updateData[`unreadCount.${participantId}`] = currentCount + 1;
      }
    }

    await Conversation.findByIdAndUpdate(conversationId, updateData);

    res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending message',
    });
  }
};

/**
 * POST /api/messages/:id/react
 * Add or remove a reaction to a message.
 */
exports.reactToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required',
      });
    }

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      (r) => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove the reaction (toggle off)
      message.reactions = message.reactions.filter(
        (r) =>
          !(r.user.toString() === req.user._id.toString() && r.emoji === emoji)
      );
    } else {
      // Add the reaction
      message.reactions.push({ user: req.user._id, emoji });
    }

    await message.save();

    const populated = await Message.findById(id)
      .populate('sender', 'username avatar')
      .populate('reactions.user', 'username');

    res.status(200).json({
      success: true,
      message: populated,
    });
  } catch (error) {
    console.error('React to message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * PUT /api/messages/:id
 * Edit an existing message.
 */
exports.editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Verify ownership
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only edit your own messages' });
    }

    // Only text messages can be edited
    if (message.type !== 'text') {
      return res.status(400).json({ success: false, message: 'Only text messages can be edited' });
    }

    message.content = content;
    message.isEdited = true;
    await message.save();

    const populated = await Message.findById(id)
      .populate('sender', 'username avatar')
      .populate('replyTo', 'content sender type');

    res.status(200).json({
      success: true,
      message: populated,
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * DELETE /api/messages/:id
 * Delete a message (me vs everyone).
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteType } = req.query; // 'me' or 'everyone'

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (deleteType === 'everyone') {
      // Verify ownership
      if (message.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only delete for everyone if you are the sender' });
      }

      message.content = 'This message was deleted';
      message.mediaUrl = '';
      message.fileName = '';
      message.fileSize = 0;
      message.isDeletedForEveryone = true;
      await message.save();
    } else {
      // Delete for me
      await Message.findByIdAndUpdate(id, {
        $addToSet: { deletedFor: req.user._id },
      });
    }

    res.status(200).json({
      success: true,
      message: deleteType === 'everyone' ? message : { _id: id, deletedFor: [req.user._id] },
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
