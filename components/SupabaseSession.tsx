'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabaseClient';

export default function SupabaseSession() {
  useEffect(() => {
    const supabase = createClient();
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(window.location.href)
        .then(() => {
          const next = url.pathname === '/login' ? '/dashboard' : url.pathname + url.search;
          window.history.replaceState({}, '', next);
        })
        .catch((e) => console.error('Error al canjear código:', e));
    }
  }, []);

  return null;
}