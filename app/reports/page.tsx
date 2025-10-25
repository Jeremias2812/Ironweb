'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';

type Row = {
  id: string;
  report_number: string | null;
  report_date: string | null;
  final_result: 'approved'|'rejected'|null;
  work_order_id: string | null;
  parts: { code?: string | null } | null;
  client: string | null;
};

export default function ReportsIndexPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string|null>(null);
  const [deletingId, setDeletingId] = useState<string|null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      (r.report_number || '').toLowerCase().includes(term) ||
      (r.parts?.code || '').toLowerCase().includes(term) ||
      (r.client || '').toLowerCase().includes(term) ||
      (r.work_order_id || '').toLowerCase().includes(term)
    );
  }, [rows, q]);

  const reload = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('reports')
      .select(`
        id, report_number, report_date, final_result, work_order_id, client,
        parts ( code )
      `)
      .order('report_date', { ascending: false })
      .limit(500);

    if (error) {
      setError(error.message);
    } else {
      setRows((data as any as Row[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, [supabase]);

  const onDelete = async (id: string) => {
    if (!confirm('¿Seguro deseas eliminar este informe? Esta acción no se puede deshacer.')) return;
    setDeletingId(id);
    try {
      // 1) Intento por API (hace borrado en cascada)
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE', headers: { 'accept': 'application/json' } });
      if (!res.ok) {
        // 2) Fallback: intento directo sobre la tabla principal
        const { error } = await supabase.from('reports').delete().eq('id', id);
        if (error) throw error;
      }
      // 3) Refrescamos desde la base para asegurar persistencia
      await reload();
    } catch (e: any) {
      alert(e?.message || 'Error eliminando');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Informes</h1>
        <Link href="/work-orders" className="btn btn-ghost">Ir a Órdenes</Link>
      </div>

      <div className="card p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          className="input w-full md:w-96"
          placeholder="Buscar por Nº informe, pieza, cliente u OT…"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
        />
        <div className="opacity-70 text-sm">{filtered.length} resultados</div>
      </div>

      {error && <div className="card text-red-300">{error}</div>}

      <div className="card p-0 overflow-x-auto">
        {loading ? (
          <div className="p-4">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 opacity-70">No hay informes.</div>
        ) : (
          <table className="table">
            <thead>
              <tr className="text-left">
                <th className="w-40">Informe Nº</th>
                <th className="w-40">Fecha</th>
                <th className="w-36">Pieza</th>
                <th>Cliente</th>
                <th className="w-28">Resultado</th>
                <th className="w-52">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-t border-white/10">
                  <td>{r.report_number || '—'}</td>
                  <td>{r.report_date ? new Date(r.report_date).toLocaleDateString() : '—'}</td>
                  <td>{r.parts?.code || '—'}</td>
                  <td>{r.client || '—'}</td>
                  <td className={r.final_result==='approved' ? 'text-green-400' : r.final_result==='rejected' ? 'text-red-400' : ''}>
                    {r.final_result ? (r.final_result==='approved' ? 'Aprobado' : 'Rechazado') : '—'}
                  </td>
                  <td className="flex gap-2">
                    <Link
                      className="btn"
                      href={`/api/reports/${r.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      PDF
                    </Link>
                    <Link
                      className="btn btn-ghost"
                      href={`/work-orders/${r.work_order_id}/reports?reportId=${r.id}&view=preview#preview`}
                    >
                      Abrir
                    </Link>
                    <button
                      className="btn btn-ghost"
                      onClick={()=>onDelete(r.id)}
                      disabled={deletingId===r.id}
                      title="Eliminar informe"
                    >
                      {deletingId===r.id ? 'Eliminando…' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}