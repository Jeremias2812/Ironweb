'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function DashboardPage() {
  const supabase = getSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState({ tools: 0, remitosOpen: 0, woOpen: 0, woInProgress: 0, overdue: 0, upcoming: 0 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [tools, remitos, woOpen, woInProgress, overdue, upcoming] = await Promise.all([
          supabase.from('tools').select('id', { count: 'exact', head: true }),
          supabase.from('remitos').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
          supabase.from('work_orders').select('id', { count: 'exact', head: true }).eq('status', 'open'),
          supabase.from('work_orders').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
          supabase.from('tools').select('id', { count: 'exact', head: true }).lt('next_maintenance_hours', 0),
          supabase.from('tools').select('id', { count: 'exact', head: true }).gte('next_maintenance_hours', 0).lte('next_maintenance_hours', 20),
        ]);

        const firstError = [tools, remitos, woOpen, woInProgress, overdue, upcoming].find((r) => r.error)?.error;
        if (firstError) throw firstError;

        setTotals({
          tools: tools.count ?? 0,
          remitosOpen: remitos.count ?? 0,
          woOpen: woOpen.count ?? 0,
          woInProgress: woInProgress.count ?? 0,
          overdue: overdue.count ?? 0,
          upcoming: upcoming.count ?? 0,
        });
      } catch (e: any) {
        setError(e.message ?? 'No se pudieron cargar métricas');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [supabase]);

  const cards = useMemo(
    () => [
      { title: 'Total herramientas', value: totals.tools },
      { title: 'Remitos abiertos', value: totals.remitosOpen },
      { title: 'OT abiertas', value: totals.woOpen },
      { title: 'OT en curso', value: totals.woInProgress },
      { title: 'Mantenimiento vencido', value: totals.overdue },
      { title: 'Mantenimiento próximo (<=20hs)', value: totals.upcoming },
    ],
    [totals],
  );

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {error && <div className="card text-red-300">{error}</div>}
      <div className="grid md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <article key={card.title} className="card">
            <h2 className="text-sm text-white/70">{card.title}</h2>
            <p className="text-3xl font-semibold mt-2">{loading ? '...' : card.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
