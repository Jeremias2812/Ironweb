'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import NavTabs from '@/components/NavTabs';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function AppShell({ children }: { children: ReactNode }) {
  const supabase = getSupabaseBrowserClient();
  const pathname = usePathname();
  const isLogin = pathname === '/login';
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, [supabase]);

  return (
    <div className="container py-6 space-y-6">
      <header className="card flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard" className="font-bold text-lg">App Herramientas · Oil & Gas</Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/70">{email ?? 'Sin sesión'}</span>
          {!email && <Link href="/login" className="btn">Login</Link>}
          {email && <button className="btn" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }}>Salir</button>}
        </div>
      </header>

      {!isLogin && <NavTabs />}
      <main>{children}</main>
    </div>
  );
}
