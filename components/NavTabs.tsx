'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/inventory', label: 'Inventario' },
  { href: '/warehouses', label: 'Depósitos' },
  { href: '/movements', label: 'Movimientos' },
  { href: '/maintenance', label: 'Mantenimiento' },
];

export default function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Navegación principal">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`btn ${active ? 'bg-blue-500/40 border border-blue-300/50' : ''}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
