'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

// --- UI helpers estilo "certificado" ---
function CertificateBox({ title, children }:{ title: string; children: React.ReactNode }) {
  return (
    <section className="border border-black/30 bg-white text-black p-3 rounded-sm">
      <h3 className="text-xs font-bold tracking-wide mb-2 border-b border-black/20 pb-1">{title}</h3>
      <div className="text-[12px] leading-5">{children}</div>
    </section>
  );
}

function FieldRow({ label, value }:{ label: string; value?: string | number | null }) {
  return (
    <div className="grid grid-cols-3 gap-2 items-center mb-1">
      <div className="text-[11px] font-medium">{label}</div>
      <div className="col-span-2 border-b border-black/50 min-h-[18px]">
        {value ? String(value) : '\u00A0'}
      </div>
    </div>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-auto bg-white shadow-sm"
      style={{ width: '210mm', minHeight: '297mm', padding: '24px' }}
    >
      {children}
    </div>
  );
}

type Cert = { id: string; code: string|null; title: string|null; customer: string|null; date: string|null; status: string; notes: string|null };
type Item = {
  id: string;
  report_id: string | null;
  part_id: string | null;
  sort_order: number;
  starts_at_page: number | null;
  pages_count: number | null;
  part?: { code?: string | null } | null;
  report?: { report_number?: string | null } | null;
  report_methods?: { method: string; result: 'approved' | 'rejected' | 'na' }[] | null;
};
type ReportRow = { id: string; report_number: string|null; part_id: string|null; parts?: { code?: string|null }|null };

export default function CertDetailPage() {
  const supabase = createClient();
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [cert, setCert] = useState<Cert | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genUrl, setGenUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // selector para agregar ítems
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [reportId, setReportId] = useState<string>('');
  const [order, setOrder] = useState<string>('0');
  const ordNum = useMemo(()=> Number.isFinite(Number(order)) ? Number(order) : 0, [order]);

  const load = async () => {
    setLoading(true); setErr(null);
    const [c, its, reps] = await Promise.all([
      supabase.from('certifications').select('id, code, title, customer, date, status, notes').eq('id', id).maybeSingle(),
      supabase.from('certification_items')
        .select(`
          id, report_id, part_id, sort_order, starts_at_page, pages_count,
          report:reports(id, report_number, part_id),
          part:parts(id, code)
        `)
        .eq('certification_id', id)
        .order('sort_order', { ascending: true }),
      supabase.from('reports').select('id, report_number, part_id, parts(id, code)').order('created_at', { ascending: false })
    ]);

    if (c.error) setErr(c.error.message);
    setCert(c.data as any);

    if (!reps.error) setReports((reps.data as any) || []);

    // Merge report_methods into items
    let itemsWithMethods: Item[] = (its.error ? [] : ((its.data as any) || []));
    const reportIds = itemsWithMethods.map((r: any) => r.report_id).filter(Boolean);

    if (reportIds.length) {
      const { data: methods, error: eM } = await supabase
        .from('report_methods')
        .select('report_id, method, result')
        .in('report_id', reportIds);

      if (!eM && methods) {
        const byReport: Record<string, { method: string; result: any }[]> = {};
        for (const m of methods) {
          byReport[m.report_id] = byReport[m.report_id] || [];
          byReport[m.report_id].push({ method: m.method, result: m.result });
        }
        itemsWithMethods = itemsWithMethods.map((it: any) => ({
          ...it,
          report_methods: byReport[it.report_id] || []
        }));
      }
    }

    setItems(itemsWithMethods);

    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  // Índice calculado: portada+índice = página 1; la primera pieza arranca en 2.
  const indexRows = useMemo(() => {
    let current = 2; // primera página es la portada+índice
    return items
      .slice()
      .sort((a,b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((it) => {
        const starts = it.starts_at_page ?? current;
        // páginas: si no está precargado, estimamos = 1 (resumen) + #métodos aplicados
        const methodsApplied = (it.report_methods || []).filter(m => m.result !== 'na').length;
        const pages = it.pages_count ?? (1 + methodsApplied);
        const out = {
          id: it.id,
          order: it.sort_order,
          reportNumber: it.report?.report_number || it.report_id?.slice(0,8) || '—',
          partCode: it.part?.code || '—',
          startPage: starts,
        };
        current = starts + (pages || 1);
        return out;
      });
  }, [items]);

  const addItem = async () => {
    if (!reportId) return;
    const r = reports.find(r => r.id === reportId);
    const { error } = await supabase
      .from('certification_items')
      .insert({
        certification_id: id,
        report_id: reportId,
        part_id: r?.part_id ?? null,
        sort_order: ordNum
      });
    if (error) { setErr(error.message); return; }
    setReportId(''); setOrder('0');
    await load();
  };

  const saveOrder = async (itemId: string, newOrder: number) => {
    const { error } = await supabase.from('certification_items').update({ sort_order: newOrder }).eq('id', itemId);
    if (!error) await load(); else setErr(error.message);
  };

  const handleDelete = async () => {
    if (!id) return;
    const ok = window.confirm('¿Eliminar esta certificación y sus ítems? Esta acción no se puede deshacer.');
    if (!ok) return;

    try {
      setDeleting(true);
      setErr(null);

      // Primero borra ítems (por si no tienes ON DELETE CASCADE)
      const delItems = await supabase
        .from('certification_items')
        .delete()
        .eq('certification_id', id);
      if (delItems.error) throw delItems.error;

      // Luego borra la certificación
      const delCert = await supabase
        .from('certifications')
        .delete()
        .eq('id', id);
      if (delCert.error) throw delCert.error;

      // Vuelve al listado
      router.push('/certifications');
    } catch (e: any) {
      setErr(e?.message || 'Error al eliminar certificación');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Certificación</h1>
        <div className="flex gap-2">
          <Link className="btn btn-ghost" href="/certifications">Volver</Link>
          <button
            className="btn btn-ghost text-red-300 border border-red-500/40 hover:bg-red-500/10"
            onClick={handleDelete}
            disabled={deleting}
            title="Eliminar certificación"
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
      {err && <div className="card text-red-300">{err}</div>}
      {genUrl && (
        <div className="card text-green-300">
          PDF generado. 
          <a href={genUrl} className="underline" target="_blank" rel="noopener">Abrir</a>
        </div>
      )}

      {loading ? <div className="card p-4">Cargando…</div> :
      !cert ? <div className="card p-4">No encontrada</div> :
      <>
        {!loading && cert && (
          <>
            {/* Tarjeta resumen compacta (sigue igual) */}
            <div className="card grid md:grid-cols-4 gap-3">
              <div><span className="opacity-70">Fecha:</span> {cert.date ? new Date(cert.date).toLocaleDateString() : '—'}</div>
              <div><span className="opacity-70">Código:</span> {cert.code || '—'}</div>
              <div className="md:col-span-2"><span className="opacity-70">Título:</span> {cert.title || '—'}</div>
              <div className="md:col-span-2"><span className="opacity-70">Cliente:</span> {cert.customer || '—'}</div>
              <div><span className="opacity-70">Estado:</span> {cert.status}</div>
            </div>

            {/* Vista previa A4: cabecera + índice */}
            <Page>
              <div className="grid grid-cols-12 gap-4 mb-4 items-start">
                <div className="col-span-3 flex items-center">
                  <img src="/logo.png" alt="Logo" className="h-12" />
                </div>
                <div className="col-span-5 flex items-center justify-center">
                  <div className="text-center font-semibold tracking-wide">CERTIFICADO DE INSPECCIÓN</div>
                </div>
                <div className="col-span-4">
                  <CertificateBox title="Datos">
                    <FieldRow label="Fecha" value={cert.date ? new Date(cert.date).toLocaleDateString() : '—'} />
                    <FieldRow label="Certificado" value={cert.title || '—'} />
                    <FieldRow label="Cliente" value={cert.customer || '—'} />
                  </CertificateBox>
                </div>
              </div>

              <CertificateBox title="Índice de piezas / informes">
                <table className="table text-[12px]">
                  <thead>
                    <tr className="text-left">
                      <th style={{width: 60}}>#</th>
                      <th style={{width: 160}}>Informe</th>
                      <th style={{width: 140}}>Pieza</th>
                      <th>Página</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indexRows.length === 0 ? (
                      <tr><td colSpan={4} className="py-6 text-center opacity-70">Sin ítems aún.</td></tr>
                    ) : indexRows
                      .sort((a,b) => (a.order ?? 0) - (b.order ?? 0))
                      .map((row, idx) => (
                      <tr key={row.id} className="border-t border-black/10">
                        <td>{idx + 1}</td>
                        <td>{row.reportNumber}</td>
                        <td>{row.partCode}</td>
                        <td className="text-right">{row.startPage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CertificateBox>
            </Page>
          </>
        )}

        <div className="card">
          <h2 className="font-semibold mb-2">Ítems (informes por pieza)</h2>
          <div className="grid md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-3">
              <label className="block text-sm opacity-70 mb-1">Informe</label>
              <select className="input w-full" value={reportId} onChange={e=>setReportId(e.target.value)}>
                <option value="">— Selecciona un informe —</option>
                {reports.map(r => (
                  <option key={r.id} value={r.id}>
                    {(r.report_number || r.id.slice(0,8))} · {r.parts?.code || '—'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm opacity-70 mb-1">Orden</label>
              <input className="input w-full" type="number" value={order} onChange={e=>setOrder(e.target.value)} />
            </div>
            <div>
              <button className="btn w-full" onClick={addItem} disabled={!reportId}>Agregar</button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="table">
              <thead>
                <tr className="text-left">
                  <th>#</th>
                  <th>Informe</th>
                  <th>Pieza</th>
                  <th>Comienza</th>
                  <th>Páginas</th>
                  <th>Orden</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={7} className="py-6 text-center opacity-70">Sin ítems aún.</td></tr>
                ) : items.map((it, idx) => (
                  <tr key={it.id} className="border-t border-white/10">
                    <td>{idx+1}</td>
                    <td>{it.report?.report_number || it.report_id?.slice(0,8) || '—'}</td>
                    <td>{it.part?.code || '—'}</td>
                    <td>{it.starts_at_page ?? '—'}</td>
                    <td>{it.pages_count ?? '—'}</td>
                    <td>
                      <input
                        className="input w-24"
                        type="number"
                        defaultValue={it.sort_order}
                        onBlur={e=>saveOrder(it.id, Number(e.target.value||0))}
                      />
                    </td>
                    <td className="text-right">
                      <Link className="btn btn-ghost" href={`/work-orders/${it.report_id}/reports`} target="_blank">Ver informe</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <a
              className="btn"
              href={`/api/certifications/${id}/pdf`}
              target="_blank"
              rel="noopener"
            >
              Generar PDF (abrir)
            </a>
            <button
              className="btn"
              onClick={async () => {
                try {
                  setGenLoading(true); setErr(null); setGenUrl(null);
                  const res = await fetch(`/api/certifications/${id}/pdf?store=1`);
                  if (!res.ok) throw new Error('Error generando PDF');
                  const url = res.headers.get('X-File-Url');
                  if (url) setGenUrl(url);
                  await load();
                } catch (e:any) {
                  setErr(e.message || 'Error generando PDF');
                } finally {
                  setGenLoading(false);
                }
              }}
              disabled={genLoading}
            >
              {genLoading ? 'Generando…' : 'Generar y guardar'}
            </button>
          </div>
        </div>
      </>}
    </div>
  );
}