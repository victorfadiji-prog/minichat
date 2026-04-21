import { createClient } from '@supabase/supabase-js';

// Replace these with your project's URL and Anon Key from your Supabase dashboard
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

/**
 * Supabase client instance.
 * Used for Auth, Database, Storage, and Realtime.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
