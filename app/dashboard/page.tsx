'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

export default function Dashboard() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [total, setTotal]               = useState(0);
  const [countNew, setCountNew]         = useState(0);
  const [countInProg, setCountInProg]   = useState(0);
  const [countPaused, setCountPaused]   = useState(0);
  const [countResolved, setCountResolved] = useState(0);
  const [reloadTs, setReloadTs] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const qTotal = supabase.from('work_orders').select('id', { count: 'exact', head: true });
        const qNew   = supabase.from('work_orders').select('id', { count: 'exact', head: true }).eq('status', 'new');
        const qProg  = supabase.from('work_orders').select('id', { count: 'exact', head: true }).eq('status', 'in_progress');
        const qPause = supabase.from('work_orders').select('id', { count: 'exact', head: true }).eq('status', 'paused');
        const qRes   = supabase.from('work_orders').select('id', { count: 'exact', head: true }).eq('status', 'resolved');
        const [t, n, p, pa, r] = await Promise.all([qTotal, qNew, qProg, qPause, qRes]);
        if (!active) return;
        if (t.error) throw t.error; if (n.error) throw n.error; if (p.error) throw p.error; if (pa.error) throw pa.error; if (r.error) throw r.error;
        setTotal(t.count ?? 0);
        setCountNew(n.count ?? 0);
        setCountInProg(p.count ?? 0);
        setCountPaused(pa.count ?? 0);
        setCountResolved(r.count ?? 0);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || 'Error cargando métricas');
      } finally {
        if (!active) return;
        setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [supabase, reloadTs]);

  const MetricCard = ({ title, value, color }: { title: string; value: number; color?: string }) => (
    <div className="card p-4">
      <div className="text-sm text-white/70 flex items-center gap-2">
        {color ? <span className="inline-block w-1.5 h-3 rounded-sm" style={{ backgroundColor: color }} /> : null}
        {title}
      </div>
      <div className="text-2xl font-bold mt-1">{loading ? '…' : value}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          className="btn btn-ghost"
          onClick={() => setReloadTs(Date.now())}
          disabled={loading}
          title="Actualizar métricas"
        >
          {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {error && <div className="card text-red-300">{error}</div>}

      {/* Métricas de órdenes */}
      <div className="grid md:grid-cols-5 gap-4">
        <MetricCard title="Total órdenes" value={total} />
        <MetricCard title="Nuevo" value={countNew} color="#ef4444" />
        <MetricCard title="En proceso" value={countInProg} color="#eab308" />
        <MetricCard title="Pausado" value={countPaused} color="#9ca3af" />
        <MetricCard title="Resuelto" value={countResolved} color="#22c55e" />
      </div>

      {/* Accesos directos */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-2">Piezas</h3>
          <p className="text-sm text-white/70">Alta y seguimiento de piezas.</p>
          <Link className="btn mt-3" href="/parts">Abrir</Link>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">Órdenes de trabajo</h3>
          <p className="text-sm text-white/70">Planificación y tareas.</p>
          <Link className="btn mt-3" href="/work-orders">Abrir</Link>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">Chat IA</h3>
          <p className="text-sm text-white/70">Consulta datos.</p>
          <Link className="btn mt-3" href="/chat">Abrir</Link>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">Informes</h3>
          <p className="text-sm text-white/70">Listado de informes generados.</p>
          <Link className="btn mt-3" href="/reports">Abrir</Link>
        </div>
      </div>
    </div>
  );
}
