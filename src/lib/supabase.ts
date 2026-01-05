import { createClient } from '@supabase/supabase-js';
import type { Database } from './db.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // We use manual OTP entry, this avoids URL parsing conflicts in Strict Mode
    },
    // This custom lock overrides the default robust lock that can hang in Brave/Safari ITP
    // We use a simple in-memory-like lock behavior (or effectively disable it for local dev stability)
    // Note: Use this with caution if you need strictly synchronized tab states, but for this app it's better than hanging.
    // However, the safest first step is just the auth options above. Use `storageKey` if needed.
  }
);
