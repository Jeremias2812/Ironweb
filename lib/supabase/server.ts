import { createClient } from "@supabase/supabase-js";

export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-key";

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
