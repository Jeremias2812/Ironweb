import './globals.css';
import SupabaseSession from '@/components/SupabaseSession';
import AppShell from '@/components/AppShell';
import RequireAuth from '@/components/RequireAuth';

export const metadata = {
  title: 'App Herramientas · Oil & Gas',
  description: 'Gestión de herramientas, remitos y mantenimiento con Next.js + Supabase',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <SupabaseSession />
        <RequireAuth>
          <AppShell>{children}</AppShell>
        </RequireAuth>
      </body>
    </html>
  );
}
