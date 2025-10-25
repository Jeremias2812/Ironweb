'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

export default function TopBar() {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const pathname = usePathname();
  const NAV = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/parts', label: 'Piezas' },
    { href: '/work-orders', label: 'Órdenes' },
    { href: '/chat', label: 'Chat IA' },
  ];
  const current = (pathname || '').split('?')[0];
  const isActive = (href: string) => current === href || current.startsWith(href + '/');

  // Cargar sesión + escuchar cambios
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) setEmail(data.user?.email ?? null);
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
      setUserOpen(false);
      setMenuOpen(false);
    });
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [supabase]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!userOpen) return;
      const el = userMenuRef.current;
      if (el && !el.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [userOpen]);

  const logout = async () => {
    setMenuOpen(false);
    try { await supabase.auth.signOut({ scope: 'global' }); } catch {}
    window.location.href = '/';
  };

  const NavLinks = () => (
    <>
      {NAV.map(({ href, label }) =>
        isActive(href) ? (
          <span key={href} className="link opacity-50 cursor-default" aria-current="page">{label}</span>
        ) : (
          <Link key={href} className="link" href={href} onClick={() => setMenuOpen(false)}>{label}</Link>
        )
      )}
    </>
  );

  return (
    <header className="mb-6 sticky top-0 z-40">
      <div className="card flex items-center justify-between gap-3">
        {/* Marca (izquierda). Quitamos “Sesión: …” para evitar duplicado */}
        <Link className="font-bold text-base" href="/">Kynetic IT</Link>

        {/* Navegación escritorio */}
        <nav className="hidden md:flex items-center gap-3" aria-label="Principal">
          <NavLinks />
          {/* User dropdown (derecha) */}
          <div className="relative" ref={userMenuRef}>
            {email ? (
              <button
                type="button"
                className="btn flex items-center gap-2"
                aria-haspopup="menu"
                aria-expanded={userOpen}
                onClick={() => setUserOpen(v => !v)}
                title={email}
              >
                <span aria-hidden>👤</span>
              </button>
            ) : (
              <Link className="btn" href="/login">Iniciar sesión</Link>
            )}

            {userOpen && email && (
              <div
                role="menu"
                className="card absolute right-0 mt-2 w-56 p-3 grid gap-2"
              >
                <div className="text-xs opacity-70 break-all" title={email}>{email}</div>
                <button type="button" className="btn" onClick={logout} role="menuitem">Cerrar sesión</button>
              </div>
            )}
          </div>
        </nav>

        {/* Botón hamburguesa móvil */}
        <button
          type="button"
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
          className="md:hidden btn"
          onClick={() => { setUserOpen(false); setMenuOpen(v => !v); }}
        >
          ☰
        </button>
      </div>

      {/* Menú móvil */}
      {menuOpen && (
        <nav className="md:hidden card mt-2 flex flex-col gap-2 p-3" role="navigation" aria-label="Menú móvil">
          <NavLinks />
          <div className="border-t border-white/10 my-1" />
          <div className="grid gap-2">
            {email ? (
              <>
                <div className="text-xs opacity-70 break-all">{email}</div>
                <button type="button" className="btn" onClick={logout}>Cerrar sesión</button>
              </>
            ) : (
              <Link className="btn" href="/login" onClick={() => setMenuOpen(false)}>Iniciar sesión</Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}