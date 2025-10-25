'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function LogoutPage() {
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      try {
        // Sign out locally
        await supabase.auth.signOut({ scope: 'local' });
        // Sign out globally
        await supabase.auth.signOut({ scope: 'global' });

        // Remove all possible localStorage keys related to supabase auth tokens
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') && key.endsWith('-auth-token'))) {
              localStorage.removeItem(key);
            }
          }
          // Remove legacy key
          localStorage.removeItem('supabase.auth.token');
        } catch {}

        // Clear sessionStorage
        try {
          sessionStorage.clear();
        } catch {}

        // Redirect to /login
        window.location.replace('/login');
      } catch (e) {
        console.error('Error al cerrar sesión', e);
      }
    })();
  }, []);

  return (
    <div className="card">
      <p>Cerrando sesión…</p>
      <p className="text-sm text-white/60">Si no redirige, <Link className="underline" href="/login">haz clic aquí</Link>.</p>
    </div>
  );
}
