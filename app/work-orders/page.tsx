'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';

// Types
type Row = {
  id: string;
  status: string | null;
  eta_hours: number | null;
  created_at: string;
  services?: { parts?: { code?: string | null; client?: string | null } | null } | null;
  app_users?: { full_name?: string | null; email?: string | null } | null;
};

type TechOpt = { id: string; label: string };

const STATUS_OPTS = [
  { code: 'new',         label: 'Nuevo',      color: 'bg-red-500' },
  { code: 'in_progress', label: 'En proceso', color: 'bg-yellow-500' },
  { code: 'paused',      label: 'Pausado',    color: 'bg-gray-400' },
  { code: 'resolved',    label: 'Resuelto',   color: 'bg-green-500' },
] as const;

const normalizeStatus = (s: string | null | undefined): 'new'|'in_progress'|'paused'|'resolved' => {
  const v = (s ?? '').toLowerCase();
  if (v === 'planned' || v === 'nuevo' || v === 'new') return 'new';
  if (v === 'in_progress' || v === 'en proceso' || v === 'en_proceso') return 'in_progress';
  if (v === 'paused' || v === 'pausado') return 'paused';
  if (v === 'done' || v === 'resuelto' || v === 'resolved') return 'resolved';
  return 'new';
};

const statusColorHex = (code: 'new'|'in_progress'|'paused'|'resolved') => {
  switch (code) {
    case 'new':         return '#ef4444'; // red-500
    case 'in_progress': return '#eab308'; // yellow-500
    case 'paused':      return '#9ca3af'; // gray-400
    case 'resolved':    return '#22c55e'; // green-500
  }
};

type SortKey = 'created_at'|'client'|'code'|'status'|'tech';

enum SortDir { ASC='asc', DESC='desc' }

export default function WorkOrdersPage() {
  const supabase = createClient();

  // List state
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  // Filters
  const [fClient, setFClient] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fTech, setFTech]     = useState('');
  const [q, setQ]             = useState('');

  // Filter options
  const [clients, setClients] = useState<string[]>([]);
  const [techs, setTechs]     = useState<TechOpt[]>([]);

  // Pagination (server)
  const pageSize = 30;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  // Sorting (client-side on the current page)
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>(SortDir.DESC);

  // Row-level saving state (for inline edits)
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const loadOptions = async () => {
      // Clients (prefer clients table; fallback to parts)
      try {
        const { data, error } = await supabase.from('clients').select('name').order('name', { ascending: true });
        if (!error && data) setClients((data as any[]).map(r => r.name).filter(Boolean));
      } catch {
        const { data } = await supabase.from('parts').select('client').not('client','is',null);
        const uniq = Array.from(new Set((data ?? []).map((r:any)=>r.client).filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b)));
        setClients(uniq as string[]);
      }
      // Technicians
      const { data: techRows } = await supabase.from('app_users').select('auth_user_id,full_name,email,role').in('role',['technician']);
      setTechs((techRows ?? []).map((t:any)=>({ id: t.auth_user_id, label: t.full_name || t.email })));
    };
    loadOptions();
  }, [supabase]);

  const load = async () => {
    setLoading(true); setError(null);

    // Base query
    let dataQ = supabase.from('work_orders')
      .select(`
        id, status, eta_hours, created_at,
        services ( parts ( code, client ) ),
        app_users!work_orders_assigned_to_fkey ( full_name, email )
      `)
      .order('created_at', { ascending: false });

    // Server-side filters (status, tech)
    if (fStatus) dataQ = dataQ.eq('status', fStatus);
    if (fTech)   dataQ = dataQ.eq('assigned_to', fTech);

    const from = (page - 1) * pageSize;
    const to   = from + pageSize - 1;
    dataQ = dataQ.range(from, to);

    const { data, error } = await dataQ;
    if (error) setError(error.message);

    let list = (data ?? []) as Row[];

    // Client + text filter on client side (since nested)
    const qn = q.trim().toLowerCase();
    list = list.filter(w => {
      const client = w.services?.parts?.client ?? '';
      const code   = w.services?.parts?.code ?? '';
      const tech   = (w.app_users?.full_name || w.app_users?.email || '') as string;
      const matchClient = fClient ? client === fClient : true;
      const matchQ = qn ? [client, code, tech].some(s => (s ?? '').toLowerCase().includes(qn)) : true;
      return matchClient && matchQ;
    });

    setTotal(list.length);

    // Sort client-side on current page
    const getVal = (r: Row) => {
      const client = r.services?.parts?.client ?? '';
      const code   = r.services?.parts?.code ?? '';
      const tech   = (r.app_users?.full_name || r.app_users?.email || '') as string;
      switch (sortKey) {
        case 'client': return client.toLowerCase();
        case 'code':   return code.toLowerCase();
        case 'status': return (r.status ?? '').toLowerCase();
        case 'tech':   return tech.toLowerCase();
        case 'created_at':
        default:       return r.created_at;
      }
    };
    list.sort((a,b) => {
      const va = getVal(a) as any;
      const vb = getVal(b) as any;
      if (va < vb) return sortDir === SortDir.ASC ? -1 : 1;
      if (va > vb) return sortDir === SortDir.ASC ? 1 : -1;
      return 0;
    });

    setRows(list);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, fClient, fStatus, fTech, q, sortKey, sortDir]);

  const badge = (s: string | null) => {
    const code = normalizeStatus(s);
    const opt = STATUS_OPTS.find(o => o.code === code)!;
    return (
      <span className="inline-flex items-center gap-2 px-2 py-1 rounded text-xs bg-white/10">
        <span className={`inline-block w-1.5 h-3 rounded-sm ${opt.color}`} />
        {opt.label}
      </span>
    );
  };

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) {
      setSortDir(d => d === SortDir.ASC ? SortDir.DESC : SortDir.ASC);
    } else {
      setSortKey(k); setSortDir(k === 'created_at' ? SortDir.DESC : SortDir.ASC);
    }
  };

  const clearFilters = () => {
    setQ(''); setFClient(''); setFStatus(''); setFTech(''); setPage(1);
  };

  const exportCSV = () => {
    const header = ['OT','Cliente','Pieza','Tecnico','Estado','ETA','Creada'];
    const lines = rows.map(r => [
      r.id,
      r.services?.parts?.client ?? '',
      r.services?.parts?.code ?? '',
      (r.app_users?.full_name || r.app_users?.email || ''),
      r.status ?? '',
      (r.eta_hours ?? '').toString(),
      new Date(r.created_at).toISOString(),
    ]);
    const csv = [header, ...lines].map(a => a.map(v => '"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'work_orders.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const updateRow = async (id: string, patch: Partial<{ status: string; assigned_to: string | null }>) => {
    setSavingId(id);
    const { error } = await supabase.from('work_orders').update(patch).eq('id', id);
    if (error) setError(error.message);
    await load();
    setSavingId(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Órdenes de trabajo</h1>

      {/* CTA Nueva orden */}
      <div className="card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Crear nueva orden</h2>
          <p className="text-sm text-white/70">Inicia el flujo para cargar cliente, pieza, servicio y asignación.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={exportCSV} disabled={loading || !!error}>Exportar CSV</button>
          <Link className="btn" href="/work-orders/new">Nueva orden</Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="card grid md:grid-cols-6 gap-3">
        <input className="input" placeholder="Buscar (cliente, código, técnico)" value={q} onChange={e=>{ setQ(e.target.value); setPage(1); }} />
        <select className="input" value={fClient} onChange={e=>{ setFClient(e.target.value); setPage(1); }}>
          <option value="">— Cliente —</option>
          {clients.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input" value={fStatus} onChange={e=>{ setFStatus(e.target.value); setPage(1); }}>
          <option value="">— Estado —</option>
          {STATUS_OPTS.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
        </select>
        <select className="input" value={fTech} onChange={e=>{ setFTech(e.target.value); setPage(1); }}>
          <option value="">— Técnico —</option>
          {techs.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <button className="btn" onClick={clearFilters}>Limpiar filtros</button>
        <div />
      </div>

      {/* Tabla */}
      <div className="card overflow-x-auto">
        {loading ? (
          <p>Cargando…</p>
        ) : error ? (
          <p className="text-red-300">Error: {error}</p>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr className="text-left">
                  <th>
                    <button className="link" onClick={()=>toggleSort('created_at')}>OT/Fecha {sortKey==='created_at' ? (sortDir===SortDir.ASC?'↑':'↓') : ''}</button>
                  </th>
                  <th>
                    <button className="link" onClick={()=>toggleSort('client')}>Cliente {sortKey==='client' ? (sortDir===SortDir.ASC?'↑':'↓') : ''}</button>
                  </th>
                  <th>
                    <button className="link" onClick={()=>toggleSort('code')}>Pieza {sortKey==='code' ? (sortDir===SortDir.ASC?'↑':'↓') : ''}</button>
                  </th>
                  <th>
                    <button className="link" onClick={()=>toggleSort('tech')}>Técnico {sortKey==='tech' ? (sortDir===SortDir.ASC?'↑':'↓') : ''}</button>
                  </th>
                  <th>
                    <button className="link" onClick={()=>toggleSort('status')}>Estado {sortKey==='status' ? (sortDir===SortDir.ASC?'↑':'↓') : ''}</button>
                  </th>
                  <th>ETA</th>
                  <th>Creada</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(w => {
                  const client = w.services?.parts?.client ?? '—';
                  const code   = w.services?.parts?.code ?? '—';
                  const tech   = w.app_users?.full_name || w.app_users?.email || '—';
                  const busy   = savingId === w.id;
                  return (
                    <tr
                      key={w.id}
                      className="border-t border-white/10"
                    >
                      <td className="font-mono">
                        <div className="flex items-center">
                          <span
                            className="inline-block w-1.5 h-4 md:h-5 rounded-sm mr-2"
                            style={{ backgroundColor: statusColorHex(normalizeStatus(w.status)) }}
                          />
                          {w.id.slice(0,8)}
                        </div>
                      </td>
                      <td>{client}</td>
                      <td>{code}</td>
                      <td>
                        <select className="input" value={fTech && techs.find(t=>t.id===fTech)?.label ? fTech : (techs.find(t=>t.label===tech)?.id || '')}
                          onChange={e=>updateRow(w.id, { assigned_to: e.target.value || null })} disabled={busy}>
                          <option value="">— Sin asignar —</option>
                          {techs.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                      </td>
                      <td>
                        <select
                          className="input"
                          value={normalizeStatus(w.status)}
                          onChange={e=>updateRow(w.id, { status: e.target.value })}
                          disabled={busy}
                        >
                          {STATUS_OPTS.map(o => (
                            <option key={o.code} value={o.code}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                      <td>{w.eta_hours ?? '—'}</td>
                      <td>{new Date(w.created_at).toLocaleString()}</td>
                      <td className="flex gap-2">
                        <Link className="btn" href={`/work-orders/${w.id}`}>Abrir</Link>
                        <Link className="btn" href={`/work-orders/${w.id}`} title="Abrir la OT para crear/ver informes">Informes</Link>
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-white/60">
                      Sin resultados con los filtros actuales.
                      <div className="mt-3">
                        <button className="btn" onClick={clearFilters}>Limpiar filtros</button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Paginación */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-white/60">
                Página {page} de {totalPages} · {total} registros
              </div>
              <div className="flex gap-2">
                <button className="btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Anterior</button>
                <button className="btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}>Siguiente</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
