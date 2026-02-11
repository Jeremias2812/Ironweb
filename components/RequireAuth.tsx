'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

const publicRoutes = new Set(['/login']);

export default function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user && !publicRoutes.has(pathname ?? '')) {
        router.replace('/login');
        return;
      }
      setReady(true);
    });
  }, [pathname, router]);

  if (!ready && !publicRoutes.has(pathname ?? '')) {
    return <div className="container py-8">Validando sesión...</div>;
  }

  return <>{children}</>;
}
