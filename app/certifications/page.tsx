'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

type Cert = {
  id: string;
  code: string | null;
  title: string | null;
  customer: string | null;
  date: string | null;
  status: 'draft'|'ready'|'issued'|string;
  created_at: string;
};

export default function CertificationsList() {
  const supabase = createClient();
  const [rows, setRows] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);

  const load = async () => {
    setLoading(true); setErr(null);
    const { data, error } = await supabase
      .from('certifications')
      .select('id, code, title, customer, date, status, created_at')
      .order('created_at', { ascending: false });
    if (error) setErr(error.message);
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Certificaciones</h1>
        <Link className="btn" href="/certifications/new">Nueva certificación</Link>
      </div>

      {err && <div className="card text-red-300">{err}</div>}
      {loading ? (
        <div className="card p-4">Cargando…</div>
      ) : rows.length === 0 ? (
        <div className="card p-4">No hay certificaciones todavía.</div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="text-left">
                <th>Fecha</th>
                <th>Código</th>
                <th>Título</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} className="border-t border-white/10">
                  <td>{c.date ? new Date(c.date).toLocaleDateString() : '—'}</td>
                  <td>{c.code || '—'}</td>
                  <td>{c.title || '—'}</td>
                  <td>{c.customer || '—'}</td>
                  <td className="capitalize">{c.status}</td>
                  <td className="text-right">
                    <Link className="btn" href={`/certifications/${c.id}`}>Abrir</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}