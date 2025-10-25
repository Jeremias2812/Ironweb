import { createClient as createSB, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  _client = createSB(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return _client;
}