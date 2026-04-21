import { supabase } from '../supabaseClient';

/**
 * Chat service — conversations and messages using Supabase.
 */
const mapMessage = (m) => ({
  ...m,
  createdAt: m.created_at,
  updatedAt: m.updated_at,
  mediaUrl: m.media_url,
  fileName: m.file_name,
  fileSize: m.file_size,
  isEdited: m.is_edited,
  isDeletedForEveryone: m.is_deleted_everyone,
  replyTo: m.reply_to,
  deletedFor: m.deleted_for,
  sender: m.sender ? { ...m.sender, avatar: m.sender.avatar_url } : null
});

const mapConversation = (conv) => ({
  ...conv,
  createdAt: conv.created_at,
  updatedAt: conv.updated_at,
  groupName: conv.group_name,
  groupAvatar: conv.group_avatar,
  adminId: conv.admin_id,
  lastMessage: conv.messages?.[0] ? mapMessage(conv.messages[0]) : null,
  participants: conv.participants.map(p => ({ ...p.profiles, avatar: p.profiles.avatar_url }))
});

/**
 * Chat service — conversations and messages using Supabase.
 */
const chatService = {
  async getConversations(userId) {
    const { data: participantData, error: pError } = await supabase
      .from('participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (pError) throw pError;
    if (!participantData.length) return { success: true, conversations: [] };

    const convIds = participantData.map(p => p.conversation_id);

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participants (
          user_id,
          profiles (id, username, avatar_url)
        ),
        messages (
          id, content, type, created_at, sender_id
        )
      `)
      .in('id', convIds)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return { success: true, conversations: data.map(mapConversation) };
  },

  async createConversation(userId, participantId) {
    const { data: conv, error: cError } = await supabase
      .from('conversations')
      .insert([{ type: 'private' }])
      .select()
      .single();

    if (cError) throw cError;

    const { error: pError } = await supabase
      .from('participants')
      .insert([
        { conversation_id: conv.id, user_id: userId },
        { conversation_id: conv.id, user_id: participantId }
      ]);

    if (pError) throw pError;
    return { success: true, conversation: conv };
  },

  async createGroupConversation(userId, participantIds, groupName) {
    const { data: conv, error: cError } = await supabase
      .from('conversations')
      .insert([{ type: 'group', group_name: groupName, admin_id: userId }])
      .select()
      .single();

    if (cError) throw cError;

    const participants = [userId, ...participantIds].map(id => ({
      conversation_id: conv.id,
      user_id: id
    }));

    const { error: pError } = await supabase.from('participants').insert(participants);
    if (pError) throw pError;

    return { success: true, conversation: conv };
  },

  async getMessages(conversationId) {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (id, username, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { success: true, messages: data.map(mapMessage) };
  },

  async sendMessage(userId, data) {
    const { conversation_id, content, type, media_url, file_name, file_size, reply_to } = data;

    const { data: message, error } = await supabase
      .from('messages')
      .insert([{
        conversation_id,
        sender_id: userId,
        content: content || '',
        type: type || 'text',
        media_url,
        file_name,
        file_size,
        reply_to
      }])
      .select(`
        *,
        sender:sender_id (id, username, avatar_url)
      `)
      .single();

    if (error) throw error;

    await supabase.from('conversations').update({ updated_at: new Date() }).eq('id', conversation_id);

    return { success: true, message: mapMessage(message) };
  },

  async reactToMessage(messageId, userId, emoji) {
    const { data: msg } = await supabase.from('messages').select('reactions').eq('id', messageId).single();
    let reactions = msg.reactions || [];

    const existing = reactions.find(r => r.user === userId && r.emoji === emoji);
    if (existing) {
      reactions = reactions.filter(r => !(r.user === userId && r.emoji === emoji));
    } else {
      reactions.push({ user: userId, emoji });
    }

    const { data, error } = await supabase
      .from('messages')
      .update({ reactions })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, message: mapMessage(data) };
  },

  async deleteMessage(messageId, deleteType, userId) {
    if (deleteType === 'everyone') {
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted_everyone: true, content: 'This message was deleted' })
        .eq('id', messageId)
        .eq('sender_id', userId);
      if (error) throw error;
    } else {
      await supabase.rpc('append_to_deleted_for', { message_id: messageId, user_id: userId });
    }
    return { success: true };
  },

  async uploadFile(file, userId) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('chat-media')
      .getPublicUrl(filePath);

    return { success: true, url: publicUrl, fileName: file.name, fileSize: file.size };
  },
};

export default chatService;
