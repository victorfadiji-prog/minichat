const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

/**
 * Map of userId → Set of socketIds (supports multiple tabs/devices).
 */
const onlineUsers = new Map();

/**
 * Initialize Socket.io event handling.
 * @param {import('socket.io').Server} io - Socket.io server instance
 */
function initializeSocket(io) {
  // Middleware: authenticate socket connections via JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: no token'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error('Authentication error: user not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`🔌 User connected: ${socket.user.username} (${userId})`);

    // Track online user
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Update user status to online
    await User.findByIdAndUpdate(userId, { status: 'online' });

    // Broadcast online status to all connected clients
    io.emit('user:online', { userId, status: 'online' });

    // Send current online users list to this socket
    const onlineUserIds = Array.from(onlineUsers.keys());
    socket.emit('users:online', onlineUserIds);

    // --- Join conversation rooms ---
    socket.on('conversation:join', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`📥 ${socket.user.username} joined conversation ${conversationId}`);
    });

    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // --- Send message ---
    socket.on('message:send', async (data) => {
      try {
        const { conversationId, content, type, mediaUrl, fileName, fileSize, replyTo } = data;

        // Verify participation
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });

        if (!conversation) return;

        // Create message
        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          content: content || '',
          type: type || 'text',
          mediaUrl: mediaUrl || '',
          fileName: fileName || '',
          fileSize: fileSize || 0,
          replyTo: replyTo || null,
          readBy: [userId],
        });

        // Update conversation
        const updateData = { lastMessage: message._id };
        for (const participantId of conversation.participants) {
          if (participantId.toString() !== userId) {
            const currentCount =
              conversation.unreadCount?.get(participantId.toString()) || 0;
            updateData[`unreadCount.${participantId}`] = currentCount + 1;
          }
        }
        await Conversation.findByIdAndUpdate(conversationId, updateData);

        // Populate the message for broadcasting
        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username avatar')
          .populate('replyTo', 'content sender type');

        // Emit to conversation room
        io.to(`conversation:${conversationId}`).emit('message:received', {
          message: populatedMessage,
          conversationId,
        });

        // Also emit to all participants who might not be in the room (for sidebar updates)
        for (const participantId of conversation.participants) {
          const pId = participantId.toString();
          if (onlineUsers.has(pId)) {
            for (const socketId of onlineUsers.get(pId)) {
              io.to(socketId).emit('conversation:updated', {
                conversationId,
                lastMessage: populatedMessage,
                unreadCount:
                  pId !== userId
                    ? (conversation.unreadCount?.get(pId) || 0) + 1
                    : 0,
              });
            }
          }
        }

        // Mark as delivered for online recipients
        for (const participantId of conversation.participants) {
          const pId = participantId.toString();
          if (pId !== userId && onlineUsers.has(pId)) {
            await Message.findByIdAndUpdate(message._id, {
              status: 'delivered',
            });
            io.to(`conversation:${conversationId}`).emit('message:status', {
              messageId: message._id,
              status: 'delivered',
            });
            break;
          }
        }
      } catch (error) {
        console.error('Socket message:send error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // --- Typing indicators ---
    socket.on('typing:start', (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        userId,
        username: socket.user.username,
        conversationId,
      });
    });

    socket.on('typing:stop', (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        userId,
        conversationId,
      });
    });

    // --- Mark messages as read ---
    socket.on('message:read', async (data) => {
      try {
        const { conversationId } = data;

        // Update all unread messages
        await Message.updateMany(
          {
            conversation: conversationId,
            sender: { $ne: userId },
            readBy: { $ne: userId },
          },
          {
            $addToSet: { readBy: userId },
            $set: { status: 'read' },
          }
        );

        // Reset unread count
        await Conversation.findByIdAndUpdate(conversationId, {
          [`unreadCount.${userId}`]: 0,
        });

        // Notify the other participants that messages were read
        socket.to(`conversation:${conversationId}`).emit('message:read', {
          conversationId,
          readBy: userId,
        });
      } catch (error) {
        console.error('Socket message:read error:', error);
      }
    });

    // --- Message reactions ---
    socket.on('message:react', async (data) => {
      try {
        const { messageId, emoji } = data;
        const message = await Message.findById(messageId);
        if (!message) return;

        // Toggle reaction
        const existingIndex = message.reactions.findIndex(
          (r) => r.user.toString() === userId && r.emoji === emoji
        );

        if (existingIndex > -1) {
          message.reactions.splice(existingIndex, 1);
        } else {
          message.reactions.push({ user: userId, emoji });
        }

        await message.save();

        const populated = await Message.findById(messageId)
          .populate('reactions.user', 'username');

        io.to(`conversation:${message.conversation}`).emit('message:reacted', {
          messageId,
          reactions: populated.reactions,
        });
      } catch (error) {
        console.error('Socket message:react error:', error);
      }
    });

    // --- Message editing ---
    socket.on('message:edit', async (data) => {
      try {
        const { messageId, content } = data;
        const message = await Message.findById(messageId);
        if (!message || message.sender.toString() !== userId) return;

        message.content = content;
        message.isEdited = true;
        await message.save();

        const populated = await Message.findById(messageId)
          .populate('sender', 'username avatar')
          .populate('replyTo', 'content sender type');

        io.to(`conversation:${message.conversation}`).emit('message:edited', {
          messageId,
          content,
          message: populated,
        });
      } catch (error) {
        console.error('Socket message:edit error:', error);
      }
    });

    // --- Message deletion ---
    socket.on('message:delete', async (data) => {
      try {
        const { messageId, deleteType } = data; // 'me' or 'everyone'
        const message = await Message.findById(messageId);
        if (!message) return;

        if (deleteType === 'everyone') {
          if (message.sender.toString() !== userId) return;

          message.content = 'This message was deleted';
          message.mediaUrl = '';
          message.fileName = '';
          message.fileSize = 0;
          message.isDeletedForEveryone = true;
          await message.save();

          io.to(`conversation:${message.conversation}`).emit('message:deleted', {
            messageId,
            deleteType: 'everyone',
            content: 'This message was deleted',
          });
        } else {
          // Delete for me
          await Message.findByIdAndUpdate(messageId, {
            $addToSet: { deletedFor: userId },
          });
          // No need to broadcast, just notify the specific user (who already knows)
          // or we can emit 'message:deleted' to the specific user's sockets
          socket.emit('message:deleted', {
            messageId,
            deleteType: 'me',
            userId,
          });
        }
      } catch (error) {
        console.error('Socket message:delete error:', error);
      }
    });

    // --- Voice/Video Calls ---

    /**
     * Initiate a call (1-on-1 or Group)
     */
    socket.on('call:initiate', ({ participants, type, conversationId, isGroup, callId }) => {
      participants.forEach(participantId => {
        if (participantId === userId) return;
        
        if (onlineUsers.has(participantId)) {
          onlineUsers.get(participantId).forEach(socketId => {
            io.to(socketId).emit('call:incoming', {
              caller: {
                _id: userId,
                username: socket.user.username,
                avatar: socket.user.avatar
              },
              type,
              conversationId,
              isGroup,
              callId,
              participants // include all so others know it's group
            });
          });
        }
      });
    });

    /**
     * Accept a call
     */
    socket.on('call:accept', ({ callerId, callId }) => {
      if (onlineUsers.has(callerId)) {
        onlineUsers.get(callerId).forEach(socketId => {
          io.to(socketId).emit('call:accepted', {
            acceptorId: userId,
            callId,
            socketId: socket.id // include acceptor's socketId for WebRTC
          });
        });
      }
    });

    /**
     * Reject a call
     */
    socket.on('call:reject', ({ callerId, callId, reason }) => {
      if (onlineUsers.has(callerId)) {
        onlineUsers.get(callerId).forEach(socketId => {
          io.to(socketId).emit('call:rejected', {
            rejectorId: userId,
            callId,
            reason: reason || 'rejected'
          });
        });
      }
    });

    /**
     * Join a group call (Mesh)
     */
    socket.on('call:join', ({ conversationId, callId }) => {
      socket.join(`call:${callId}`);
      // Notify others in the room that a new peer has joined
      socket.to(`call:${callId}`).emit('call:peer-joined', {
        userId,
        username: socket.user.username,
        socketId: socket.id,
        callId
      });
    });

    /**
     * Pass-through WebRTC Signaling
     */
    socket.on('call:signal', ({ to, signal, callId }) => {
      // 'to' should be a socketId for precision in Mesh
      io.to(to).emit('call:signal', {
        from: userId,
        fromSocketId: socket.id,
        signal,
        callId
      });
    });

    /**
     * Toggle media state (mute/camera off) — broadcast to peers
     */
    socket.on('call:toggle-media', ({ callId, kind, enabled, participants }) => {
      // Broadcast to call room for group calls
      socket.to(`call:${callId}`).emit('call:media-toggled', {
        userId,
        kind,
        enabled,
        callId
      });
      // Also notify by userId for 1-on-1
      participants?.forEach(pId => {
        if (pId === userId) return;
        if (onlineUsers.has(pId)) {
          onlineUsers.get(pId).forEach(sid => {
            io.to(sid).emit('call:media-toggled', {
              userId,
              kind,
              enabled,
              callId
            });
          });
        }
      });
    });

    /**
     * Add a new participant mid-call (upgrade 1-on-1 → group)
     */
    socket.on('call:add-participant', ({ callId, newParticipants, type, conversationId, existingParticipants }) => {
      // Join the call room (if not already)
      socket.join(`call:${callId}`);

      // Send incoming call to each new participant
      newParticipants.forEach(participantId => {
        if (participantId === userId) return;
        if (onlineUsers.has(participantId)) {
          onlineUsers.get(participantId).forEach(sid => {
            io.to(sid).emit('call:incoming', {
              caller: {
                _id: userId,
                username: socket.user.username,
                avatar: socket.user.avatar
              },
              type,
              conversationId,
              isGroup: true,
              callId,
              participants: [...(existingParticipants || []), ...newParticipants]
            });
          });
        }
      });

      // Tell existing peers in the room that new people were invited
      socket.to(`call:${callId}`).emit('call:participants-updated', {
        callId,
        newParticipants,
        addedBy: userId
      });
    });

    /**
     * End/Leave call — always notifies ALL participants so both sides end
     */
    socket.on('call:end', ({ callId, participants, isGroup: isGroupCall }) => {
      // Leave the call room
      socket.leave(`call:${callId}`);

      // For group calls, just notify the room that this peer left
      if (isGroupCall) {
        io.to(`call:${callId}`).emit('call:peer-left', {
          userId,
          socketId: socket.id,
          callId
        });
      }

      // ALWAYS notify all listed participants directly that this user ended/left
      // This ensures 1-on-1 calls always end on both sides
      participants?.forEach(pId => {
        if (pId === userId) return;
        if (onlineUsers.has(pId)) {
          onlineUsers.get(pId).forEach(sid => {
            io.to(sid).emit('call:ended', {
              endedBy: userId,
              callId,
              isGroup: isGroupCall || false
            });
          });
        }
      });
    });

    // --- Disconnect ---
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${socket.user.username}`);

      // Remove this socket from the user's set
      if (onlineUsers.has(userId)) {
        onlineUsers.get(userId).delete(socket.id);
        if (onlineUsers.get(userId).size === 0) {
          onlineUsers.delete(userId);

          // Update user status
          await User.findByIdAndUpdate(userId, {
            status: 'offline',
            lastSeen: new Date(),
          });

          // Broadcast offline status
          io.emit('user:online', { userId, status: 'offline' });
        }
      }
    });
  });
}

module.exports = { initializeSocket, onlineUsers };
