'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function MaintenancePage() {
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('work_orders').select('*, tools(code, description)').order('created_at', { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, [supabase]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Mantenimiento / OT</h1><Link href="/maintenance/new" className="btn">Nueva OT</Link></div>
      <div className="card overflow-auto">
        <table className="table"><thead><tr className="text-left text-white/70"><th>Título</th><th>Herramienta</th><th>Estado</th><th>Fecha</th><th /></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-white/10"><td>{row.title}</td><td>{row.tools?.code}</td><td>{row.status}</td><td>{new Date(row.created_at).toLocaleDateString()}</td><td><Link className="btn" href={`/maintenance/${row.id}`}>Ver</Link></td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
