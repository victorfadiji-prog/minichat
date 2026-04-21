import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Diagnostic Alert (Only shows in production if there is an issue)
if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('YOUR_'))) {
  const msg = `⚠️ Supabase Config Issue!\n\nURL: ${supabaseUrl || 'MISSING'}\nKey: ${supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + '...' : 'MISSING'}\n\nCheck Vercel Settings!`;
  console.error(msg);
  // Uncomment the line below if you want the popup to appear on the screen:
  // alert(msg); 
}

/**
 * Supabase client instance.
 * Used for Auth, Database, Storage, and Realtime.
 */
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);
