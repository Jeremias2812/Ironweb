'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function WarehousesPage() {
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('warehouses').select('*').order('name').then(({ data }) => setRows(data ?? []));
  }, [supabase]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Depósitos / Ubicaciones</h1><Link href="/warehouses/new" className="btn">Nuevo depósito</Link></div>
      <div className="card overflow-auto">
        <table className="table"><thead><tr className="text-left text-white/70"><th>Nombre</th><th>Tipo</th><th>Notas</th><th /></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-white/10"><td>{row.name}</td><td>{row.type}</td><td>{row.notes ?? '-'}</td><td><Link href={`/warehouses/${row.id}/edit`} className="btn">Editar</Link></td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
