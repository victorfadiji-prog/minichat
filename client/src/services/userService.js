import { supabase } from '../supabaseClient';

/**
 * User service — search and profile operations using Supabase.
 */
const mapProfile = (p) => ({
  ...p,
  avatar: p.avatar_url,
  lastSeen: p.last_seen,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
  notificationSettings: p.notification_settings,
  customRingtone: p.custom_ringtone
});

/**
 * User service — search and profile operations using Supabase.
 */
const userService = {
  async searchUsers(query) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);
    
    if (error) throw error;
    return { success: true, users: data.map(mapProfile) };
  },

  async getUserById(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return { success: true, user: mapProfile(data) };
  },

  async updateProfile(userId, data) {
    const { data: updated, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, user: mapProfile(updated) };
  },

  async getContacts(userId) {
    const { data: profile, error: pError } = await supabase
      .from('profiles')
      .select('contacts')
      .eq('id', userId)
      .single();

    if (pError) throw pError;
    if (!profile.contacts || profile.contacts.length === 0) return { success: true, contacts: [] };

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('id', profile.contacts);

    if (error) throw error;
    return { success: true, contacts: data.map(mapProfile) };
  },
  
  // ... (keeping other methods as they were but ensuring consistency)
  async addContact(currentUserId, targetUserId) {
    const { data: profile } = await supabase.from('profiles').select('contacts').eq('id', currentUserId).single();
    const contacts = [...(profile.contacts || []), targetUserId];
    const { error } = await supabase.from('profiles').update({ contacts: [...new Set(contacts)] }).eq('id', currentUserId);
    if (error) throw error;
    return { success: true };
  },

  async removeContact(currentUserId, targetUserId) {
    const { data: profile } = await supabase.from('profiles').select('contacts').eq('id', currentUserId).single();
    const contacts = (profile.contacts || []).filter(id => id !== targetUserId);
    const { error } = await supabase.from('profiles').update({ contacts }).eq('id', currentUserId);
    if (error) throw error;
    return { success: true };
  },

  async findUserByEmail(email) {
    const { data, error } = await supabase.from('profiles').select('*').eq('email', email.toLowerCase()).single();
    if (error && error.code !== 'PGRST116') throw error;
    return { success: true, user: data ? mapProfile(data) : null };
  },
};

export default userService;
