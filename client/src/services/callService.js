import { supabase } from '../supabaseClient';

/**
 * Call service — create, update, and fetch call records using Supabase.
 */
const callService = {
  async getCallHistory(userId) {
    const { data, error } = await supabase
      .from('calls')
      .select('*')
      .contains('participants', [userId])
      .order('started_at', { ascending: false });

    if (error) throw error;
    return { success: true, calls: data.map(c => ({
      ...c,
      startedAt: c.started_at,
      endedAt: c.ended_at,
      isGroup: c.is_group
    })) };
  },

  async getCall(callId) {
    const { data, error } = await supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .single();

    if (error) throw error;
    return { success: true, call: {
      ...data,
      startedAt: data.started_at,
      endedAt: data.ended_at,
      isGroup: data.is_group
    } };
  },

  async createCall({ participants, type, conversation, isGroup, callerId }) {
    const { data, error } = await supabase
      .from('calls')
      .insert([{ 
        participants, 
        type, 
        conversation_id: conversation, 
        is_group: isGroup,
        caller_id: callerId,
        status: 'ongoing'
      }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, call: data };
  },

  async updateCall(callId, { status, duration }) {
    const updateData = { status, duration };
    if (status === 'completed' || status === 'rejected' || status === 'missed') {
      updateData.ended_at = new Date();
    }

    const { data, error } = await supabase
      .from('calls')
      .update(updateData)
      .eq('id', callId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, call: data };
  },
};

export default callService;
