'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import Link from 'next/link';

const STATUS_OPTS = [
  { code: 'new',         label: 'Nuevo' },
  { code: 'in_progress', label: 'En proceso' },
  { code: 'paused',      label: 'Pausado' },
  { code: 'resolved',    label: 'Resuelto' },
] as const;

type Detail = {
  id: string;
  status: string | null;
  eta_hours: number | null;
  created_at: string;
  assigned_to?: string | null;
  services?: {
    id: string;
    parts?: { id?: string | null; code?: string | null; client?: string | null } | null;
  } | null;
  app_users?: { full_name?: string | null; email?: string | null } | null;
  description?: string | null;
};

type ServiceItem = {
  service_id: string;
  part_id: string | null;
  part_code: string | null;
  client: string | null;
};

const normalizeStatus = (s: string | null | undefined): 'new'|'in_progress'|'paused'|'resolved' => {
  const v = (s ?? '').toString().trim().toLowerCase();
  if (v === 'planned' || v === 'nuevo' || v === 'new') return 'new';
  if (v === 'in_progress' || v === 'en proceso' || v === 'en_proceso') return 'in_progress';
  if (v === 'paused' || v === 'pausado') return 'paused';
  if (v === 'done' || v === 'resuelto' || v === 'resolved') return 'resolved';
  return 'new';
};

export default function WorkOrderDetail() {
  const supabase = createClient();
  const params = useParams() as { id: string | string[] };
  const wid = Array.isArray(params.id) ? params.id[0] : params.id;

  // Build reports link, optionally preselecting a specific service (piece)
  const reportLink = (sid?: string) => sid
    ? `/work-orders/${wid}/reports?serviceId=${sid}`
    : `/work-orders/${wid}/reports`;

  const [row, setRow] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editStatus, setEditStatus]   = useState<'new'|'in_progress'|'paused'|'resolved'>('new');
  const [editEta, setEditEta]         = useState<string>('');
  const [editTech, setEditTech]       = useState<string | null>(null);
  const [success, setSuccess]         = useState<string | null>(null);

  const [servicesList, setServicesList] = useState<ServiceItem[]>([]);
  const [reportsByPart, setReportsByPart] = useState<Record<string, string | null>>({});

  const singleServiceId = useMemo(() => (servicesList.length === 1 ? servicesList[0]?.service_id : undefined), [servicesList]);

  type Tech = { id: string; label: string };
  const [techs, setTechs] = useState<Tech[]>([]);

  const isInt = (v: string) => /^\d+$/.test(v);

  const curEta = useMemo(() => (row?.eta_hours != null ? String(row.eta_hours) : ''), [row]);
  const curTech = useMemo(() => (row?.assigned_to ?? null), [row]);
  const curStatus = useMemo(() => normalizeStatus(row?.status), [row]);

  const hasChanges = useMemo(() => {
    return (
      curStatus !== editStatus ||
      curEta !== editEta ||
      curTech !== editTech
    );
  }, [curStatus, curEta, curTech, editStatus, editEta, editTech]);

  const load = useCallback(async () => {
    if (!wid) return;
    setLoading(true); setErr(null); setSuccess(null);

    try {
      const [wo, users] = await Promise.all([
        supabase
          .from('work_orders')
          .select(`
            id, status, eta_hours, created_at, assigned_to,
            services ( id, parts ( id, code, client ) ),
            app_users!work_orders_assigned_to_fkey ( full_name, email )
          `)
          .eq('id', wid)
          .maybeSingle(),
        supabase
          .from('app_users')
          .select('auth_user_id, full_name, email')
      ]);

      if (wo.error) throw wo.error;
      const data = (wo.data as any) as Detail | null;
      if (!data) throw new Error('Orden no encontrada');

      // Normalizar services a objeto si viene como array
      const rawServices: any = data.services;
      const service = Array.isArray(rawServices) ? rawServices[0] : rawServices;
      const normalized: Detail = { ...data, services: service ?? null } as Detail;
      setRow(normalized);

      // Fetch all services (multi-piece support)
      try {
        // Try bridge table first
        const bridge = await supabase
          .from('work_order_services')
          .select(`
            service_id,
            services!inner (
              id,
              parts ( id, code, client )
            )
          `)
          .eq('work_order_id', wid);
  
        if (bridge.error && bridge.error.code !== '42P01') {
          throw bridge.error;
        }
  
        if (!bridge.error && Array.isArray(bridge.data) && bridge.data.length > 0) {
          const list: ServiceItem[] = bridge.data.map((r: any) => ({
            service_id: r.service_id,
            part_id: r.services?.parts?.id ?? null,
            part_code: r.services?.parts?.code ?? null,
            client: r.services?.parts?.client ?? null,
          }));
          setServicesList(list);
        } else {
          // Fallback: legacy single service via work_orders.service_id
          const svc = Array.isArray(rawServices) ? rawServices : [rawServices];
          const first = (svc ?? []).filter(Boolean)[0] as any;
          if (first?.id) {
            setServicesList([{
              service_id: first.id,
              part_id: first.parts?.id ?? null,
              part_code: first.parts?.code ?? null,
              client: first.parts?.client ?? null,
            }]);
          } else {
            setServicesList([]);
          }
        }
      } catch (e) {
        // If table doesn't exist, ignore and try legacy path already set above
        const svc = Array.isArray(rawServices) ? rawServices : [rawServices];
        const first = (svc ?? []).filter(Boolean)[0] as any;
        if (first?.id) {
          setServicesList([{
            service_id: first.id,
            part_id: first.parts?.id ?? null,
            part_code: first.parts?.code ?? null,
            client: first.parts?.client ?? null,
          }]);
        } else {
          setServicesList([]);
        }
      }

      // seed edit fields
      setEditStatus(normalizeStatus(normalized?.status));
      setEditEta(normalized?.eta_hours != null ? String(normalized.eta_hours) : '');
      setEditTech(normalized?.assigned_to ?? null);

      if (!users.error && Array.isArray(users.data)) {
        const list: Tech[] = users.data.map(u => ({
          id: u.auth_user_id,
          label: u.full_name || u.email || u.auth_user_id,
        }));
        setTechs(list);
      }
    } catch (e: any) {
      setErr(e?.message || 'Error cargando la OT');
    } finally {
      setLoading(false);
    }
  }, [wid, supabase]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const partIds = servicesList.map(s => s.part_id).filter((x): x is string => !!x);
    if (!partIds.length) return;
    const supa = createClient();
    (async () => {
      const toFetch = partIds.filter(pid => reportsByPart[pid] === undefined);
      if (!toFetch.length) return;
      const updates: Record<string, string | null> = {};
      for (const pid of toFetch) {
        const { data, error } = await supa
          .from('reports')
          .select('id')
          .eq('work_order_id', wid)
          .eq('part_id', pid)
          .order('report_date', { ascending: false })
          .limit(1);
        if (!error && data && data.length) {
          updates[pid] = data[0].id as string;
        } else {
          updates[pid] = null;
        }
      }
      if (Object.keys(updates).length) {
        setReportsByPart(prev => ({ ...prev, ...updates }));
      }
    })();
  }, [wid, servicesList, reportsByPart]);

  const saveAll = async () => {
    if (!row) return;
    if (!hasChanges) { setSuccess('No hay cambios para guardar.'); return; }
    setSaving(true); setErr(null); setSuccess(null);

    // basic validations
    if (editEta !== '' && !isInt(editEta)) {
      setErr('ETA debe ser un número entero de horas (o dejar vacío).');
      setSaving(false);
      return;
    }

    const payload: any = {
      status: editStatus,
      eta_hours: editEta === '' ? null : Number(editEta),
      assigned_to: editTech ?? null,
    };

    const { error } = await supabase
      .from('work_orders')
      .update(payload)
      .eq('id', wid);

    if (error) {
      setErr(error.message);
    } else {
      setSuccess('Cambios guardados.');
      await load();
    }

    setSaving(false);
  };

  if (loading) return <div className="card p-4">Cargando…</div>;
  if (!row) return <div className="card p-4">No encontrada</div>;

  const primary = servicesList[0];
  const client = (primary?.client ?? row.services?.parts?.client) ?? '—';
  const code   = (primary?.part_code ?? row.services?.parts?.code) ?? '—';
  const tech   = row.app_users?.full_name || row.app_users?.email || '—';

  return (
    <div className="space-y-6">
      {err && <div className="card text-red-300">{err}</div>}
      {success && <div className="card text-green-300">{success}</div>}

      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">OT {row.id.slice(0,8)}</h1>
        <div className="flex gap-2">
          <Link className="btn" href={reportLink(singleServiceId)}>Informes</Link>
          <Link className="btn" href="/work-orders">Ver todas</Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4 space-y-2">
          <h2 className="font-semibold">Resumen</h2>
          <div><span className="opacity-70">Cliente:</span> {client}</div>
          <div><span className="opacity-70">Pieza:</span> {code}</div>
          <div><span className="opacity-70">Técnico:</span> {tech}</div>
          <div><span className="opacity-70">Creada:</span> {new Date(row.created_at).toLocaleString()}</div>
          <div><span className="opacity-70">ETA (hs):</span> {row.eta_hours ?? '—'}</div>
        </div>

        <div className="card p-4 space-y-3">
          <h2 className="font-semibold">Edición</h2>

          <label className="block text-sm opacity-80">Estado</label>
          <select
            className="input w-full"
            value={editStatus}
            onChange={(e)=>setEditStatus(e.target.value as any)}
          >
            {STATUS_OPTS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
          </select>

          <label className="block text-sm opacity-80">ETA (horas)</label>
          <input
            className="input w-full"
            type="number"
            inputMode="numeric"
            min={0}
            value={editEta}
            onChange={(e)=>setEditEta(e.target.value)}
            placeholder="ej: 24"
          />

          <label className="block text-sm opacity-80">Técnico asignado</label>
          <select
            className="input w-full"
            value={editTech ?? ''}
            onChange={(e)=>setEditTech(e.target.value || null)}
          >
            <option value="">— Sin asignar —</option>
            {techs.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>

          <div className="flex gap-2 pt-2">
            <button
              className="btn"
              onClick={saveAll}
              disabled={saving || !hasChanges}
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => { if (!saving) { setEditStatus(curStatus); setEditEta(curEta); setEditTech(curTech); setErr(null); setSuccess(null); } }}
              disabled={saving || !hasChanges}
            >
              Descartar
            </button>
          </div>
        </div>

      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-2">Piezas de la OT</h2>
        {servicesList.length === 0 ? (
          <div className="opacity-70 text-sm">Sin piezas asociadas.</div>
        ) : (
          <table className="table">
            <thead>
              <tr className="text-left">
                <th className="w-48 py-2 text-sm font-medium opacity-80">Código</th>
                <th className="py-2 text-sm font-medium opacity-80">Cliente</th>
                <th className="w-40 py-2 text-sm font-medium opacity-80 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {servicesList.map((s) => (
                <tr key={s.service_id} className="border-t border-white/10 odd:bg-white/5 hover:bg-white/10 transition-colors">
                  <td>{s.part_code ?? '—'}</td>
                  <td>{s.client ?? '—'}</td>
                  <td className="flex gap-2">
                    {s.part_id && reportsByPart[s.part_id] ? (
                      <>
                        <a
                          className="btn"
                          href={`/api/reports/${reportsByPart[s.part_id]}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          title="Descargar/abrir PDF del informe"
                        >
                          Exportar PDF
                        </a>
                        <Link
                          className="btn btn-ghost"
                          href={`/work-orders/${wid}/reports?serviceId=${s.service_id}`}
                          title="Ver / editar informe"
                        >
                          Ver informe
                        </Link>
                      </>
                    ) : (
                      <Link
                        className="btn"
                        href={`/work-orders/${wid}/reports?serviceId=${s.service_id}`}
                        title="Crear informe para esta pieza"
                      >
                        Crear informe
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-2">Trabajo a realizar</h2>
        <p className="whitespace-pre-wrap">{row.description ?? '—'}</p>
      </div>
    </div>
  );
}