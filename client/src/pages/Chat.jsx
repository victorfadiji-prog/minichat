import React, { useState, useEffect, useRef, useCallback } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import chatService from '../services/chatService';
import userService from '../services/userService';
import { formatMessageTime, formatConversationTime, formatDateSeparator, formatFileSize, formatLastSeen } from '../utils/formatDate';
import { API_URL } from '../services/api';

// ============ SVG Icons (inline for zero dependencies) ============
const Icons = {
  Search: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
  ),
  Send: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
  ),
  Attach: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
  ),
  Emoji: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
  ),
  Close: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  ),
  Back: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
  ),
  Plus: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  ),
  Users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  Logout: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
  ),
  CheckAll: () => (
    <svg width="16" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 6 7 17 2 12"/><polyline points="23 6 12 17" /></svg>
  ),
  File: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
  ),
  Menu: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
  ),
  Reply: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
  ),
  UserPlus: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/></svg>
  ),
  Contact: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="23 21 23 11 17 11 17 21"/><line x1="17" y1="15" x2="23" y2="15"/></svg>
  ),
  UserCheck: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
  ),
  Mail: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
  ),
  SidebarToggle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
  ),
};

// Quick reactions
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

/**
 * Avatar component — displays user initial or image.
 */
function Avatar({ username, avatar, size = '' }) {
  const initial = username ? username.charAt(0).toUpperCase() : '?';
  const className = `avatar ${size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : ''}`;

  return (
    <div className={className}>
      {avatar ? <img src={avatar} alt={username} /> : initial}
    </div>
  );
}

/**
 * Main Chat Page
 * Manages conversations list, active chat, messages, and real-time events.
 */
export default function Chat() {
  const { user, logout } = useAuth();
  const { socket, isUserOnline } = useSocket();

  // State
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [showSearch, setShowSearch] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [externalContacts, setExternalContacts] = useState([]);
  const [showContacts, setShowContacts] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ============ Load conversations ============
  useEffect(() => {
    loadConversations();
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoadingContacts(true);
      const data = await userService.getContacts();
      if (data.success) {
        setContacts(data.contacts);
        setExternalContacts(data.externalContacts || []);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const data = await chatService.getConversations();
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  // ============ Load messages for active conversation ============
  const loadMessages = useCallback(async (conversationId, page = 1) => {
    try {
      setLoadingMessages(true);
      const data = await chatService.getMessages(conversationId, page);
      if (data.success) {
        if (page === 1) {
          setMessages(data.messages);
        } else {
          setMessages((prev) => [...data.messages, ...prev]);
        }
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // ============ Select conversation ============
  const selectConversation = useCallback(
    async (conv) => {
      setActiveConversation(conv);
      setMessages([]);
      setReplyTo(null);
      setPendingFile(null);
      setShowEmojiPicker(false);

      // On mobile, hide sidebar
      if (window.innerWidth <= 768) {
        setSidebarVisible(false);
      }

      // Join socket room
      if (socket) {
        // Leave previous room
        if (activeConversation) {
          socket.emit('conversation:leave', activeConversation._id);
        }
        socket.emit('conversation:join', conv._id);
      }

      // Load messages
      await loadMessages(conv._id);

      // Mark as read
      if (socket) {
        socket.emit('message:read', { conversationId: conv._id });
      }
      try {
        await chatService.markAsRead(conv._id);
      } catch {}

      // Update unread count locally
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conv._id ? { ...c, unreadCount: 0 } : c
        )
      );
    },
    [socket, activeConversation, loadMessages]
  );

  // ============ Scroll to bottom ============
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // ============ Socket event handlers ============
  useEffect(() => {
    if (!socket) return;

    // New message received
    const handleMessage = ({ message, conversationId }) => {
      if (activeConversation?._id === conversationId) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });

        // Mark as read if we're in this conversation
        socket.emit('message:read', { conversationId });
        chatService.markAsRead(conversationId).catch(() => {});
      }
    };

    // Conversation updated (for sidebar)
    const handleConversationUpdated = async ({ conversationId, lastMessage, unreadCount }) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c._id === conversationId);
        
        if (index === -1) {
          // New conversation not in our list! 
          // We need to fetch it to show it in the sidebar.
          chatService.getConversation(conversationId).then(data => {
            if (data.success) {
              setConversations(current => {
                // Check again to avoid race conditions
                if (current.some(c => c._id === conversationId)) return current;
                return [data.conversation, ...current];
              });
            }
          });
          return prev;
        }

        const updated = prev.map((c, i) => {
          if (i === index) {
            return {
              ...c,
              lastMessage,
              unreadCount:
                activeConversation?._id === conversationId ? 0 : unreadCount,
              updatedAt: new Date().toISOString(),
            };
          }
          return c;
        });

        // Sort by most recent
        return [...updated].sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        );
      });
    };

    // Message status update
    const handleMessageStatus = ({ messageId, status }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, status } : m))
      );
    };

    // Messages read
    const handleMessageRead = ({ conversationId, readBy }) => {
      if (activeConversation?._id === conversationId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.sender?._id === user._id || m.sender === user._id) {
              return { ...m, status: 'read' };
            }
            return m;
          })
        );
      }
    };

    // Typing indicators
    const handleTypingStart = ({ userId, username, conversationId }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [conversationId]: { userId, username },
      }));
    };

    const handleTypingStop = ({ userId, conversationId }) => {
      setTypingUsers((prev) => {
        const updated = { ...prev };
        if (updated[conversationId]?.userId === userId) {
          delete updated[conversationId];
        }
        return updated;
      });
    };

    // Reactions
    const handleReaction = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    };

    socket.on('message:received', handleMessage);
    socket.on('conversation:updated', handleConversationUpdated);
    socket.on('message:status', handleMessageStatus);
    socket.on('message:read', handleMessageRead);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('message:reacted', handleReaction);

    // Message edited
    socket.on('message:edited', ({ messageId, content }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, content, isEdited: true } : m))
      );
    });

    // Message deleted
    socket.on('message:deleted', ({ messageId, deleteType, content }) => {
      setMessages((prev) => {
        if (deleteType === 'me') {
          return prev.filter((m) => m._id !== messageId);
        }
        return prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                content: content || 'This message was deleted',
                isDeletedForEveryone: true,
                mediaUrl: '',
                fileName: '',
                fileSize: 0,
              }
            : m
        );
      });
    });

    return () => {
      socket.off('message:received', handleMessage);
      socket.off('conversation:updated', handleConversationUpdated);
      socket.off('message:status', handleMessageStatus);
      socket.off('message:read', handleMessageRead);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('message:reacted', handleReaction);
      socket.off('message:edited');
      socket.off('message:deleted');
    };
  }, [socket, activeConversation, user]);

  // ============ Send message ============
  const sendMessage = async () => {
    const content = messageInput.trim();
    if (!content && !pendingFile) return;
    if (!activeConversation) return;

    let mediaUrl = '';
    let messageType = 'text';
    let fileName = '';
    let fileSize = 0;

    // Upload file if present
    if (pendingFile) {
      try {
        const uploadData = await chatService.uploadFile(pendingFile.file);
        if (uploadData.success) {
          mediaUrl = uploadData.file.url;
          messageType = uploadData.file.type;
          fileName = uploadData.file.name;
          fileSize = uploadData.file.size;
        }
      } catch (err) {
        console.error('File upload failed:', err);
        return;
      }
    }

    const msgData = {
      conversationId: activeConversation._id,
      content,
      type: pendingFile ? messageType : 'text',
      mediaUrl,
      fileName,
      fileSize,
      replyTo: replyTo?._id || null,
    };

    // Send via socket for real-time
    socket.emit('message:send', msgData);

    // Clear input
    setMessageInput('');
    setReplyTo(null);
    setPendingFile(null);
    setShowEmojiPicker(false);

    // Stop typing
    socket.emit('typing:stop', { conversationId: activeConversation._id });

    // Focus input
    messageInputRef.current?.focus();
  };

  // ============ Handle typing ============
  const handleTyping = (e) => {
    setMessageInput(e.target.value);

    if (!socket || !activeConversation) return;

    // Emit typing start
    socket.emit('typing:start', { conversationId: activeConversation._id });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: activeConversation._id });
    }, 2000);
  };

  // ============ Handle key press ============
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ============ Handle file selection ============
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPendingFile({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : null,
    });

    // Reset file input
    e.target.value = '';
  };

  // ============ Handle reaction ============
  const handleReaction = (messageId, emoji) => {
    if (!socket) return;
    socket.emit('message:react', { messageId, emoji });
    setHoveredMessage(null);
  };

  // ============ Search users ============
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const data = await userService.searchUsers(searchQuery);
        if (data.success) {
          setSearchResults(data.users);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ============ Start conversation with user ============
  const startConversation = async (participantId) => {
    try {
      const data = await chatService.createConversation(participantId);
      if (data.success) {
        setShowSearch(false);
        setSearchQuery('');

        // If new, add to conversations list
        if (data.isNew) {
          setConversations((prev) => [data.conversation, ...prev]);
        }

        selectConversation(data.conversation);
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  // ============ Contact Management ============
  const isContact = (userId) => {
    return contacts.some((c) => c._id === userId);
  };

  const handleAddContact = async (userId) => {
    try {
      const data = await userService.addContact(userId);
      if (data.success) {
        setContacts(data.contacts);
      }
    } catch (err) {
      console.error('Failed to add contact:', err);
    }
  };

  const handleRemoveContact = async (userId) => {
    if (!window.confirm('Remove from contacts?')) return;
    try {
      const data = await userService.removeContact(userId);
      if (data.success) {
        setContacts(data.contacts);
      }
    } catch (err) {
      console.error('Failed to remove contact:', err);
    }
  };

  const handleAddExternalContact = async (email, name) => {
    try {
      const data = await userService.addExternalContact(email, name);
      if (data.success) {
        setExternalContacts(data.externalContacts);
        return true;
      }
    } catch (err) {
      console.error('Failed to add external contact:', err);
      return false;
    }
  };

  const handleRemoveExternalContact = async (email) => {
    if (!window.confirm('Remove this manual contact?')) return;
    try {
      const data = await userService.removeExternalContact(email);
      if (data.success) {
        setExternalContacts(data.externalContacts);
      }
    } catch (err) {
      console.error('Failed to remove external contact:', err);
    }
  };

  // ============ Get other participant in private chat ============
  const getOtherParticipant = (conv) => {
    if (!conv || !conv.participants) return null;
    return conv.participants.find((p) => p._id !== user._id) || conv.participants[0];
  };

  // ============ Get conversation display name ============
  const getConversationName = (conv) => {
    if (conv.type === 'group') return conv.groupName || 'Group';
    const other = getOtherParticipant(conv);
    return other?.username || 'Unknown';
  };

  // ============ Check if message is from current user ============
  const isOwnMessage = (msg) => {
    const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
    return senderId === user._id;
  };

  // ============ Render message status ticks ============
  const renderStatus = (msg) => {
    if (!isOwnMessage(msg)) return null;
    if (msg.type === 'system') return null;

    switch (msg.status) {
      case 'read':
        return <span className="message-status read"><Icons.CheckAll /></span>;
      case 'delivered':
        return <span className="message-status delivered"><Icons.CheckAll /></span>;
      default:
        return <span className="message-status sent"><Icons.Check /></span>;
    }
  };

  // ============ Load more messages ============
  const loadMore = () => {
    if (pagination?.hasMore && activeConversation) {
      loadMessages(activeConversation._id, pagination.page + 1);
    }
  };

  // ============ Handle logout ============
  const handleLogout = async () => {
    if (socket) {
      socket.disconnect();
    }
    await logout();
  };

  // ============ Edit message ============
  const handleEditMessage = async () => {
    if (!editingMessage || !messageInput.trim()) return;

    try {
      const data = await chatService.editMessage(editingMessage._id, messageInput.trim());
      if (data.success) {
        // Updated locally via socket or manual update
        setMessages((prev) =>
          prev.map((m) => (m._id === editingMessage._id ? data.message : m))
        );
        socket.emit('message:edit', {
          messageId: editingMessage._id,
          content: messageInput.trim(),
        });
        setEditingMessage(null);
        setMessageInput('');
      }
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  // ============ Delete message ============
  const handleDeleteMessage = async (messageId, deleteType) => {
    try {
      const data = await chatService.deleteMessage(messageId, deleteType);
      if (data.success) {
        if (deleteType === 'everyone') {
          socket.emit('message:delete', { messageId, deleteType: 'everyone' });
        } else {
          setMessages((prev) => prev.filter((m) => m._id !== messageId));
        }
        setContextMenu(null);
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  // ============ Group messages by date ============
  const groupMessagesByDate = (msgs) => {
    const groups = [];
    let currentDate = '';

    for (const msg of msgs) {
      const msgDate = new Date(msg.createdAt).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ type: 'date', date: msg.createdAt });
      }
      groups.push({ type: 'message', data: msg });
    }

    return groups;
  };

  // ============ Typing info for active conversation ============
  const activeTypingUser = activeConversation
    ? typingUsers[activeConversation._id]
    : null;

  // ============ Total unread count ============
  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c.unreadCount || 0),
    0
  );

  // ============ RENDER ============
  return (
    <div className="chat-layout">
      {/* ====== SIDEBAR ====== */}
      <aside className={`sidebar ${!sidebarVisible ? 'hidden' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowProfileModal(true)}>
            <Avatar username={user?.username} avatar={user?.avatar} size="sm" />
            <h2>MiniChat</h2>
          </div>
          <div className="sidebar-actions">
            <button
              className="icon-btn"
              title="New Chat"
              onClick={() => setShowNewChat(true)}
              id="new-chat-btn"
            >
              <Icons.Plus />
            </button>
            <button
              className="icon-btn"
              title="Contacts"
              onClick={() => setShowContacts(true)}
              id="contacts-btn"
            >
              <Icons.Contact />
            </button>
            <button
              className="icon-btn"
              title="New Group"
              onClick={() => setShowGroupModal(true)}
              id="new-group-btn"
            >
              <Icons.Users />
            </button>
            <div className="relative">
              <button
                className="icon-btn"
                title="Menu"
                onClick={() => setShowMenu(!showMenu)}
                id="menu-btn"
              >
                <Icons.Menu />
              </button>
              {showMenu && (
                <div className="profile-dropdown">
                  <button
                    className="profile-dropdown-item danger"
                    onClick={handleLogout}
                    id="logout-btn"
                  >
                    <Icons.Logout /> Sign Out
                  </button>
                  <button
                    className="profile-dropdown-item"
                    onClick={() => {
                      setShowMenu(false);
                      setShowProfileModal(true);
                    }}
                  >
                    <Icons.Plus /> Profile Settings
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <span className="search-icon"><Icons.Search /></span>
            <input
              type="text"
              className="search-input"
              placeholder="Search or start new chat"
              id="sidebar-search"
              onFocus={() => setShowNewChat(true)}
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="conversation-list" id="conversation-list">
          {loadingConversations ? (
            <div className="flex justify-center" style={{ padding: '2rem' }}>
              <div className="spinner" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="search-no-results">
              <p>No conversations yet</p>
              <p style={{ marginTop: '8px', fontSize: 'var(--font-xs)' }}>
                Click the + button to start a new chat
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const other = getOtherParticipant(conv);
              const name = getConversationName(conv);
              const isActive = activeConversation?._id === conv._id;
              const lastMsg = conv.lastMessage;
              const isOnline = other && isUserOnline(other._id);

              return (
                <div
                  key={conv._id}
                  className={`conversation-item ${isActive ? 'active' : ''}`}
                  onClick={() => selectConversation(conv)}
                  id={`conv-${conv._id}`}
                >
                  <div className="conversation-avatar">
                    <Avatar
                      username={conv.type === 'group' ? conv.groupName : other?.username}
                      avatar={conv.type === 'group' ? conv.groupAvatar : other?.avatar}
                    />
                    {conv.type === 'private' && (
                      <span className={`status-dot ${isOnline ? 'online' : ''}`} />
                    )}
                  </div>

                  <div className="conversation-info">
                    <div className="conversation-top">
                      <span className="conversation-name">{name}</span>
                      <span className={`conversation-time ${conv.unreadCount > 0 ? 'unread' : ''}`}>
                        {lastMsg && formatConversationTime(lastMsg.createdAt || conv.updatedAt)}
                      </span>
                    </div>
                    <div className="conversation-bottom">
                      <span className="conversation-preview">
                        {lastMsg
                          ? lastMsg.type === 'system'
                            ? lastMsg.content
                            : lastMsg.type === 'image'
                            ? '📷 Photo'
                            : lastMsg.type === 'video'
                            ? '🎥 Video'
                            : lastMsg.type === 'file'
                            ? `📄 ${lastMsg.fileName || 'File'}`
                            : lastMsg.content
                          : 'No messages yet'}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="unread-badge">{conv.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ====== CHAT WINDOW ====== */}
      <main className="chat-window">
        {!activeConversation ? (
          /* Empty state */
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <h3>MiniChat Web</h3>
            <p>
              Send and receive messages in real-time.
              Select a conversation from the sidebar or start a new chat.
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <button
                className="icon-btn back-btn"
                onClick={() => {
                  setSidebarVisible(true);
                  setActiveConversation(null);
                }}
                style={{ display: window.innerWidth <= 768 ? 'flex' : 'none' }}
              >
                <Icons.Back />
              </button>

              <button
                className="icon-btn sidebar-toggle-btn"
                onClick={() => setSidebarVisible(!sidebarVisible)}
                title={sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'}
                style={{ display: window.innerWidth <= 768 ? 'none' : 'flex', marginRight: '8px' }}
              >
                <Icons.SidebarToggle />
              </button>

              <Avatar
                username={getConversationName(activeConversation)}
                avatar={
                  activeConversation.type === 'group'
                    ? activeConversation.groupAvatar
                    : getOtherParticipant(activeConversation)?.avatar
                }
                size="sm"
              />

              <div 
                className="chat-header-info" 
                onClick={() => setShowChatInfo(!showChatInfo)}
                style={{ cursor: 'pointer' }}
              >
                <div className="chat-header-name">
                  {getConversationName(activeConversation)}
                </div>
                <div className={`chat-header-status ${activeTypingUser ? 'typing' : ''}`}>
                  {activeTypingUser
                    ? `${activeTypingUser.username} is typing...`
                    : activeConversation.type === 'private'
                    ? isUserOnline(getOtherParticipant(activeConversation)?._id)
                      ? 'online'
                      : formatLastSeen(getOtherParticipant(activeConversation)?.lastSeen)
                    : `${activeConversation.participants?.length || 0} members`}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="messages-container" id="messages-container">
              {/* Load more button */}
              {pagination?.hasMore && (
                <button className="load-more-btn" onClick={loadMore}>
                  {loadingMessages ? (
                    <div className="spinner" />
                  ) : (
                    'Load older messages'
                  )}
                </button>
              )}

              {groupMessagesByDate(messages).map((item, idx) => {
                if (item.type === 'date') {
                  return (
                    <div key={`date-${idx}`} className="date-separator">
                      <span>{formatDateSeparator(item.date)}</span>
                    </div>
                  );
                }

                const msg = item.data;
                const own = isOwnMessage(msg);
                const senderName =
                  typeof msg.sender === 'object'
                    ? msg.sender.username
                    : 'Unknown';

                if (msg.type === 'system') {
                  return (
                    <div key={msg._id} className="message-wrapper system">
                      <div className="message-bubble system">{msg.content}</div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg._id}
                    className={`message-wrapper ${own ? 'outgoing' : 'incoming'}`}
                    onMouseEnter={() => setHoveredMessage(msg._id)}
                    onMouseLeave={() => setHoveredMessage(null)}
                  >
                    {/* Sender name (in groups) */}
                    {!own && activeConversation.type === 'group' && (
                      <span className="message-sender">{senderName}</span>
                    )}

                    <div className={`message-bubble ${own ? 'outgoing' : 'incoming'}`}>
                      {/* Reply preview */}
                      {msg.replyTo && (
                        <div className="message-reply">
                          <div className="message-reply-sender">
                            {typeof msg.replyTo.sender === 'object'
                              ? msg.replyTo.sender.username
                              : 'User'}
                          </div>
                          <div className="message-reply-content">
                            {msg.replyTo.content || `[${msg.replyTo.type}]`}
                          </div>
                        </div>
                      )}

                      {/* Media content */}
                      {msg.type === 'image' && msg.mediaUrl && (
                        <div className="message-media">
                          <img
                            src={`${API_URL}${msg.mediaUrl}`}
                            alt="Shared image"
                            onClick={() => setMediaPreview(`${API_URL}${msg.mediaUrl}`)}
                            loading="lazy"
                          />
                        </div>
                      )}

                      {msg.type === 'video' && msg.mediaUrl && (
                        <div className="message-media">
                          <video
                            src={`${API_URL}${msg.mediaUrl}`}
                            controls
                            preload="metadata"
                          />
                        </div>
                      )}

                      {msg.type === 'file' && (
                        <a
                          href={`${API_URL}${msg.mediaUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="message-file"
                        >
                          <span className="message-file-icon"><Icons.File /></span>
                          <div className="message-file-info">
                            <div className="message-file-name">{msg.fileName}</div>
                            <div className="message-file-size">{formatFileSize(msg.fileSize)}</div>
                          </div>
                        </a>
                      )}

                      {/* Text content */}
                      {msg.content && (
                        <div className="message-content">
                          {msg.isDeletedForEveryone ? (
                            <span className="deleted-text">
                              <i>🚫 This message was deleted</i>
                            </span>
                          ) : (
                            msg.content
                          )}
                        </div>
                      )}

                      {/* Footer: time + status */}
                      <div className="message-footer">
                        <span className="message-time">
                          {formatMessageTime(msg.createdAt)}
                          {msg.isEdited && <span className="edited-tag"> (edited)</span>}
                        </span>
                        {renderStatus(msg)}
                      </div>

                      {/* Reaction picker on hover */}
                      {hoveredMessage === msg._id && (
                        <div className="reaction-picker">
                          {REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg._id, emoji)}
                              title={emoji}
                            >
                              {emoji}
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              setReplyTo(msg);
                              messageInputRef.current?.focus();
                              setHoveredMessage(null);
                            }}
                            title="Reply"
                          >
                            <Icons.Reply />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Reactions display */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="message-reactions">
                        {Object.entries(
                          msg.reactions.reduce((acc, r) => {
                            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([emoji, count]) => {
                          const userReacted = msg.reactions.some(
                            (r) =>
                              r.emoji === emoji &&
                              (r.user?._id === user._id || r.user === user._id)
                          );
                          return (
                            <span
                              key={emoji}
                              className={`reaction-chip ${userReacted ? 'active' : ''}`}
                              onClick={() => handleReaction(msg._id, emoji)}
                            >
                              {emoji}
                              <span className="reaction-count">{count}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing indicator */}
              {activeTypingUser && (
                <div className="typing-indicator">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Reply Bar */}
            {replyTo && (
              <div className="reply-bar">
                <div className="reply-bar-content">
                  <div className="reply-bar-sender">
                    {typeof replyTo.sender === 'object'
                      ? replyTo.sender.username
                      : 'User'}
                  </div>
                  <div className="reply-bar-text">
                    {replyTo.content || `[${replyTo.type}]`}
                  </div>
                </div>
                <button className="reply-bar-close" onClick={() => setReplyTo(null)}>
                  <Icons.Close />
                </button>
              </div>
            )}

            {/* Edit Bar */}
            {editingMessage && (
              <div className="reply-bar editing">
                <div className="reply-bar-content">
                  <div className="reply-bar-sender text-primary">Editing Message</div>
                  <div className="reply-bar-text">{editingMessage.content}</div>
                </div>
                <button
                  className="reply-bar-close"
                  onClick={() => {
                    setEditingMessage(null);
                    setMessageInput('');
                  }}
                >
                  <Icons.Close />
                </button>
              </div>
            )}

            {/* File preview bar */}
            {pendingFile && (
              <div className="media-preview-bar">
                {pendingFile.preview ? (
                  <img
                    src={pendingFile.preview}
                    alt="Preview"
                    className="media-preview-thumb"
                  />
                ) : (
                  <span style={{ fontSize: '2rem' }}>📄</span>
                )}
                <div className="media-preview-info">
                  <div className="media-preview-name">{pendingFile.name}</div>
                  <div className="media-preview-size">
                    {formatFileSize(pendingFile.size)}
                  </div>
                </div>
                <button
                  className="media-preview-remove"
                  onClick={() => setPendingFile(null)}
                >
                  <Icons.Close />
                </button>
              </div>
            )}

            {/* Message Input */}
            <div className="message-input-container">
              <div className="input-actions">
                <button
                  className="icon-btn"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Emoji"
                >
                  <Icons.Emoji />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                >
                  <Icons.Attach />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="file-input-hidden"
                  onChange={handleFileSelect}
                  accept="image/*,video/*,.pdf,.doc,.docx,.zip,.txt"
                />
              </div>

              <div className="input-field-wrapper">
                <textarea
                  ref={messageInputRef}
                  className="input-field"
                  placeholder="Type a message"
                  value={messageInput}
                  onChange={handleTyping}
                  onKeyDown={handleKeyPress}
                  rows={1}
                  id="message-input"
                />
              </div>

              <button
                className="send-btn"
                onClick={editingMessage ? handleEditMessage : sendMessage}
                disabled={!messageInput.trim() && !pendingFile}
                title={editingMessage ? 'Save Edit' : 'Send'}
                id="send-btn"
              >
                {editingMessage ? <Icons.Check /> : <Icons.Send />}
              </button>
            </div>

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="emoji-picker-wrapper">
                <EmojiPicker
                  theme="dark"
                  onEmojiClick={(emojiData) => {
                    setMessageInput((prev) => prev + emojiData.emoji);
                  }}
                  searchPlaceholder="Search emojis..."
                  width="100%"
                  height="400px"
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* ====== CHAT INFO SIDE PANEL ====== */}
      {showChatInfo && activeConversation && (
        <ChatInfo
          conversation={activeConversation}
          user={user}
          onClose={() => setShowChatInfo(false)}
          isContact={isContact}
          onAddContact={handleAddContact}
          onUpdate={(updatedConv) => {
            setActiveConversation(updatedConv);
            setConversations((prev) =>
              prev.map((c) => (c._id === updatedConv._id ? updatedConv : c))
            );
          }}
          onLeave={() => {
            setConversations((prev) =>
              prev.filter((c) => c._id !== activeConversation._id)
            );
            setActiveConversation(null);
            setShowChatInfo(false);
          }}
        />
      )}

      {/* ====== CONTACTS MODAL ====== */}
      {showContacts && (
        <ContactsModal
          contacts={contacts}
          isUserOnline={isUserOnline}
          onClose={() => setShowContacts(false)}
          onSelect={(userId) => {
            startConversation(userId);
            setShowContacts(false);
          }}
          onRemove={handleRemoveContact}
        />
      )}

      {/* ====== PROFILE MODAL ====== */}
      {showProfileModal && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfileModal(false)}
          onUpdate={(updatedUser) => {
            // In a real app, update context. For now, we'll force a reload or assume state is managed.
            window.location.reload();
          }}
        />
      )}
      {/* ====== CONTEXT MENU ====== */}
      {contextMenu && (
        <>
          <div 
            className="fixed inset-0 z-[1999]" 
            onClick={() => setContextMenu(null)}
          />
          <div 
            className="context-menu"
            style={{ 
              top: `${Math.min(contextMenu.y, window.innerHeight - 150)}px`, 
              left: `${Math.min(contextMenu.x, window.innerWidth - 170)}px` 
            }}
          >
            <button 
              className="context-menu-item"
              onClick={() => {
                const msg = messages.find(m => m._id === contextMenu.messageId);
                setReplyTo(msg);
                setContextMenu(null);
                messageInputRef.current?.focus();
              }}
            >
              <Icons.Reply /> Reply
            </button>
            
            {contextMenu.isOwn && (
              <button 
                className="context-menu-item"
                onClick={() => {
                  const msg = messages.find(m => m._id === contextMenu.messageId);
                  if (msg.type === 'text') {
                    setEditingMessage(msg);
                    setMessageInput(msg.content);
                    setContextMenu(null);
                    messageInputRef.current?.focus();
                  }
                }}
              >
                <Icons.Plus /> Edit
              </button>
            )}

            <button 
              className="context-menu-item danger"
              onClick={() => handleDeleteMessage(contextMenu.messageId, 'me')}
            >
              <Icons.Close /> Delete for me
            </button>

            {contextMenu.isOwn && (
              <button 
                className="context-menu-item danger"
                onClick={() => handleDeleteMessage(contextMenu.messageId, 'everyone')}
              >
                <Icons.Close /> Delete for everyone
              </button>
            )}
          </div>
        </>
      )}

      {/* ====== NEW CHAT HUB MODAL ====== */}
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onStartChat={(userId) => {
            startConversation(userId);
            setShowNewChat(false);
          }}
          isContact={isContact}
          onAddContact={handleAddContact}
          onAddExternal={handleAddExternalContact}
          contacts={contacts}
          externalContacts={externalContacts}
          isUserOnline={isUserOnline}
          onRemoveContact={handleRemoveContact}
          onRemoveExternal={handleRemoveExternalContact}
        />
      )}

      {/* ====== GROUP CREATION MODAL ====== */}
      {showGroupModal && (
        <GroupModal
          onClose={() => setShowGroupModal(false)}
          onCreated={(conv) => {
            setConversations((prev) => [conv, ...prev]);
            selectConversation(conv);
            setShowGroupModal(false);
          }}
          isUserOnline={isUserOnline}
        />
      )}

      {/* ====== MEDIA PREVIEW MODAL ====== */}
      {mediaPreview && (
        <div className="modal-overlay" onClick={() => setMediaPreview(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setMediaPreview(null)}>
              <Icons.Close />
            </button>
            <img src={mediaPreview} alt="Preview" />
          </div>
        </div>
      )}

      {/* Close menu overlay */}
      {showMenu && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
          }}
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}

/**
 * GroupModal — create a new group conversation.
 */
function GroupModal({ onClose, onCreated, isUserOnline }) {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await userService.searchUsers(searchQuery);
        if (data.success) {
          setSearchResults(
            data.users.filter(
              (u) => !selectedUsers.some((s) => s._id === u._id)
            )
          );
        }
      } catch {}
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedUsers]);

  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) return;

    setLoading(true);
    try {
      const data = await chatService.createGroupConversation(
        selectedUsers.map((u) => u._id),
        groupName.trim()
      );
      if (data.success) {
        onCreated(data.conversation);
      }
    } catch (err) {
      console.error('Group creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group-modal" onClick={onClose}>
      <div className="group-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="group-modal-header">
          <h3>Create Group</h3>
          <button className="icon-btn" onClick={onClose}>
            <Icons.Close />
          </button>
        </div>

        <div className="group-modal-body">
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Group Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              id="group-name-input"
            />
          </div>

          {/* Selected participants */}
          {selectedUsers.length > 0 && (
            <div className="selected-participants">
              {selectedUsers.map((u) => (
                <span key={u._id} className="selected-chip">
                  {u.username}
                  <button
                    onClick={() =>
                      setSelectedUsers((prev) =>
                        prev.filter((s) => s._id !== u._id)
                      )
                    }
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="form-group">
            <label>Add Participants (min. 2)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="search-results" style={{ maxHeight: '200px', marginTop: '8px' }}>
            {searchResults.map((u) => (
              <div
                key={u._id}
                className="search-result-item"
                onClick={() => {
                  setSelectedUsers((prev) => [...prev, u]);
                  setSearchQuery('');
                }}
              >
                <Avatar username={u.username} avatar={u.avatar} size="sm" />
                <div className="search-result-info">
                  <div className="search-result-name">{u.username}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="group-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={createGroup}
            disabled={loading || !groupName.trim() || selectedUsers.length < 2}
            style={{ width: 'auto' }}
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ProfileModal — view and edit user profile settings.
 */
function ProfileModal({ user, onClose, onUpdate }) {
  const [username, setUsername] = useState(user?.username || '');
  const [about, setAbout] = useState(user?.about || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await chatService.uploadFile(file);
      if (data.success) {
        setAvatar(data.file.url);
      }
    } catch (err) {
      setError('Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!username.trim()) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const data = await userService.updateProfile(user._id, {
        username: username.trim(),
        about: about.trim(),
        avatar,
      });

      if (data.success) {
        onUpdate(data.user);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Profile Settings</h3>
          <button className="icon-btn" onClick={onClose}>
            <Icons.Close />
          </button>
        </div>

        <div className="modal-body profile-modal-body">
          <div className="profile-avatar-setup">
            <div className="relative">
              <Avatar username={username} avatar={avatar} size="lg" />
              <button
                className="avatar-edit-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Change Avatar"
              >
                <Icons.Plus />
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleAvatarChange}
              accept="image/*"
            />
          </div>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
            />
          </div>

          <div className="form-group">
            <label>About</label>
            <textarea
              className="form-input"
              rows={3}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Tell us about yourself"
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">Profile updated successfully!</div>}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            className="btn-primary"
            onClick={handleUpdate}
            disabled={loading || !username.trim()}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ChatInfo — Right-side panel for group/contact details and management.
 */
function ChatInfo({ conversation, user, onClose, onUpdate, onLeave, isContact, onAddContact }) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const isAdmin =
    conversation.type === 'group' &&
    (conversation.admin?._id === user?._id || conversation.admin === user?._id);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setLoadingSearch(true);
    try {
      const data = await userService.searchUsers(query);
      if (data.success) {
        // Filter out existing participants
        const existingIds = conversation.participants.map((p) => p._id);
        const filtered = data.users.filter((u) => !existingIds.includes(u._id));
        setSearchResults(filtered);
      }
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoadingSearch(false);
    }
  };

  const addParticipant = async (userId) => {
    try {
      const data = await chatService.addParticipants(conversation._id, [userId]);
      if (data.success) {
        onUpdate(data.conversation);
        setShowAddMember(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Add failed', err);
    }
  };

  const removeParticipant = async (userId) => {
    if (!window.confirm('Remove this participant?')) return;
    try {
      const data = await chatService.removeParticipant(conversation._id, userId);
      if (data.success) {
        onUpdate(data.conversation);
      }
    } catch (err) {
      console.error('Remove failed', err);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      const data = await chatService.leaveGroup(conversation._id);
      if (data.success) {
        onLeave();
      }
    } catch (err) {
      console.error('Leave failed', err);
    }
  };

  const otherUser =
    conversation.type === 'private'
      ? conversation.participants.find((p) => p._id !== user._id)
      : null;

  return (
    <aside className="chat-info-panel">
      <div className="chat-info-header">
        <h3>{conversation.type === 'group' ? 'Group Info' : 'Contact Info'}</h3>
        <button className="icon-btn" onClick={onClose}>
          <Icons.Close />
        </button>
      </div>

      <div className="chat-info-body">
        <div className="info-profile">
          <Avatar
            username={
              conversation.type === 'group' ? conversation.groupName : otherUser?.username
            }
            avatar={
              conversation.type === 'group' ? conversation.groupAvatar : otherUser?.avatar
            }
            size="lg"
          />
          <h2>
            {conversation.type === 'group' ? conversation.groupName : otherUser?.username}
          </h2>
          {conversation.type === 'group' ? (
            <span className="members-count">
              {conversation.participants.length} members
            </span>
          ) : (
            <>
              {!isContact(otherUser?._id) && (
                <button 
                  className="btn-primary-sm mt-2"
                  onClick={() => onAddContact(otherUser?._id)}
                >
                  <Icons.UserPlus /> Add to Contacts
                </button>
              )}
            </>
          )}
        </div>

        {conversation.type === 'private' && otherUser?.about && (
          <div className="info-section">
            <label>About</label>
            <p>{otherUser.about}</p>
          </div>
        )}

        <div className="info-section">
          <div className="flex justify-between items-center mb-2">
            <label>Participants</label>
            {isAdmin && (
              <button
                className="btn-text-primary"
                onClick={() => setShowAddMember(!showAddMember)}
              >
                <Icons.Plus /> Add
              </button>
            )}
          </div>

          {showAddMember && (
            <div className="add-member-search">
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
              />
              <div className="search-results-mini">
                {searchResults.map((u) => (
                  <div
                    key={u._id}
                    className="search-item-mini"
                    onClick={() => addParticipant(u._id)}
                  >
                    <Avatar username={u.username} avatar={u.avatar} size="xs" />
                    <span>{u.username}</span>
                    <Icons.Plus />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="participants-list">
            {conversation.participants.map((p) => (
              <div key={p._id} className="participant-item">
                <Avatar username={p.username} avatar={p.avatar} size="xs" />
                <div className="participant-info">
                  <span className="participant-name">
                    {p.username === user.username ? 'You' : p.username}
                  </span>
                  {(conversation.admin?._id === p._id || conversation.admin === p._id) && (
                    <span className="admin-badge">Admin</span>
                  )}
                </div>
                {isAdmin && p._id !== user._id && (
                  <button className="remove-btn" onClick={() => removeParticipant(p._id)}>
                    <Icons.Close />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {conversation.type === 'group' && (
          <div className="info-actions">
            <button className="btn-danger-outline" onClick={handleLeave}>
              <Icons.Logout /> Leave Group
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

/**
 * ContactsModal — view and search through saved contacts.
 */
function ContactsModal({
  contacts,
  isUserOnline,
  onSelect,
  onClose,
  onRemove,
}) {
  const [search, setSearch] = useState('');

  const filtered = contacts.filter(
    (c) =>
      c.username.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="search-modal" onClick={onClose}>
      <div
        className="search-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="search-modal-header">
          <button className="icon-btn" onClick={onClose}>
            <Icons.Back />
          </button>
          <div className="flex-1 flex flex-col">
            <h3 className="text-lg font-semibold ml-2">Your Contacts</h3>
            <input
              type="text"
              className="search-modal-input"
              placeholder="Filter contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="search-results">
          {filtered.length > 0 ? (
            filtered.map((u) => (
              <div
                key={u._id}
                className="search-result-item"
                onClick={() => onSelect(u._id)}
              >
                <Avatar username={u.username} avatar={u.avatar} size="sm" />
                <div className="search-result-info">
                  <div className="search-result-name">{u.username}</div>
                  <div className="search-result-about">
                    {u.about || u.email}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="icon-btn-sm text-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(u._id);
                    }}
                    title="Remove contact"
                  >
                    <Icons.Close />
                  </button>
                  <span
                    className={`status-dot ${isUserOnline(u._id) ? 'online' : ''}`}
                    style={{ position: 'static' }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="search-no-results">
              {search
                ? 'No contacts match your search'
                : 'No contacts saved yet'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * NewChatModal — Perfected hub for finding users, manual adding, and contact management.
 */
function NewChatModal({
  onClose,
  onStartChat,
  contacts,
  externalContacts,
  isContact,
  onAddContact,
  onAddExternal,
  isUserOnline,
  onRemoveContact,
  onRemoveExternal,
}) {
  const [activeTab, setActiveTab] = useState('find'); // 'find', 'manual', 'contacts'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  const [manualSuccess, setManualSuccess] = useState(false);

  // Global user search
  useEffect(() => {
    if (activeTab !== 'find' || !query || query.length < 1) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await userService.searchUsers(query);
        if (data.success) setResults(data.users);
      } catch {
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, activeTab]);

  const handleManualAdd = async (e) => {
    e.preventDefault();
    setManualLoading(true);
    const success = await onAddExternal(manualEmail, manualName);
    setManualLoading(false);
    
    if (success) {
      setManualSuccess(true);
      setManualEmail('');
      setManualName('');
      // Show success message for 3 seconds before switching
      setTimeout(() => {
        setManualSuccess(false);
        setActiveTab('pending');
      }, 2000);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-hub-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hub-header">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">New Conversation</h2>
            <button className="icon-btn" onClick={onClose}>
              <Icons.Close />
            </button>
          </div>

          <div className="modal-hub-tabs">
            <button
              className={`hub-tab ${activeTab === 'find' ? 'active' : ''}`}
              onClick={() => setActiveTab('find')}
            >
              Find People
            </button>
            <button
              className={`hub-tab ${activeTab === 'contacts' ? 'active' : ''}`}
              onClick={() => setActiveTab('contacts')}
            >
              Your Contacts
            </button>
            <button
              className={`hub-tab ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              Pending {externalContacts.length > 0 && `(${externalContacts.length})`}
            </button>
            <button
              className={`hub-tab ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >
              Add Manually
            </button>
          </div>
        </div>

        <div className="modal-hub-body">
          {activeTab === 'find' && (
            <div className="hub-find-section">
              <div className="search-input-wrapper mb-4">
                <span className="search-icon">
                  <Icons.Search />
                </span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Find by name or email..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="hub-results-list">
                {loading ? (
                  <div className="flex justify-center p-8">
                    <div className="spinner" />
                  </div>
                ) : results.length > 0 ? (
                  results.map((u) => (
                    <div key={u._id} className="hub-result-item">
                      <Avatar username={u.username} avatar={u.avatar} size="sm" />
                      <div className="flex-1 ml-3">
                        <div className="font-semibold">{u.username}</div>
                        <div className="text-xs text-secondary">{u.email}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="btn-primary-sm"
                          onClick={() => onStartChat(u._id)}
                        >
                          <Icons.Send /> Chat
                        </button>
                        {!isContact(u._id) && (
                          <button
                            className="btn-outline-sm"
                            onClick={() => onAddContact(u._id)}
                          >
                            <Icons.UserPlus /> Save
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : query.length >= 2 ? (
                  <div className="text-center p-8 text-tertiary">
                    No users found matching "{query}"
                  </div>
                ) : (
                  <div className="text-center p-8 text-tertiary">
                    Type at least 2 characters to search the global directory
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="hub-contacts-section">
              {contacts.length > 0 ? (
                <div className="hub-results-list">
                  {contacts.map((u) => (
                    <div key={u._id} className="hub-result-item">
                      <Avatar username={u.username} avatar={u.avatar} size="sm" />
                      <div className="flex-1 ml-3">
                        <div className="font-semibold">{u.username}</div>
                        <div className="text-xs text-secondary">
                          {isUserOnline(u._id) ? (
                            <span className="text-online">Online</span>
                          ) : (
                            'Offline'
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="btn-primary-sm"
                          onClick={() => onStartChat(u._id)}
                        >
                          <Icons.Send /> Chat
                        </button>
                        <button
                          className="icon-btn-sm text-danger"
                          onClick={() => onRemoveContact(u._id)}
                        >
                          <Icons.Close />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 text-tertiary">
                  Your contact list is empty. Find people or add them manually!
                </div>
              )}
            </div>
          )}

          {activeTab === 'pending' && (
            <div className="hub-pending-section">
              {externalContacts.length > 0 ? (
                <div className="hub-results-list">
                  {externalContacts.map((c) => (
                    <div key={c.email} className="hub-result-item">
                      <div className="avatar avatar-sm">?</div>
                      <div className="flex-1 ml-3">
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-xs text-secondary">
                          {c.email} (Pending Join)
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="btn-outline-sm disabled"
                          style={{ opacity: 0.6, cursor: 'not-allowed' }}
                          title="Can chat once they join"
                        >
                          <Icons.Mail /> Invited
                        </button>
                        <button
                          className="icon-btn-sm text-danger"
                          onClick={() => onRemoveExternal(c.email)}
                        >
                          <Icons.Close />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 text-tertiary">
                  No pending invitations.
                </div>
              )}
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="hub-manual-section">
              {manualSuccess ? (
                <div className="flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
                  <div className="text-4xl mb-4">🏆</div>
                  <h3 className="text-lg font-bold text-success mb-2">Contact Saved!</h3>
                  <p className="text-tertiary">
                    They will appear in your "Pending" tab until they register.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleManualAdd} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase text-tertiary">
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="search-input w-full mt-1"
                      placeholder="e.g. friend@example.com"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-tertiary">
                      Display Name
                    </label>
                    <input
                      type="text"
                      className="search-input w-full mt-1"
                      placeholder="e.g. John Doe"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-primary w-full p-3 font-bold mt-2"
                    disabled={manualLoading}
                  >
                    {manualLoading ? 'Saving...' : 'Add to Contacts'}
                  </button>
                  <p className="text-xs text-center text-tertiary mt-2">
                    Manual contacts will be marked as "Pending" until they create
                    an account with this email.
                  </p>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
