'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';

export default function AuthStatus() {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // lee el usuario actual
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    // escucha cambios de sesión
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    // refresca la página para que la UI se actualice
    window.location.href = '/';
  };

  return (
    <div className="mb-4 flex items-center justify-between gap-2 card">
      <div className="text-sm">
        {email ? (
          <span>Sesión iniciada como <strong>{email}</strong></span>
        ) : (
          <span>No has iniciado sesión</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {email ? (
          <button className="btn" onClick={signOut}>Cerrar sesión</button>
        ) : (
          <Link className="btn" href="/login">Iniciar sesión</Link>
        )}
      </div>
    </div>
  );
}
