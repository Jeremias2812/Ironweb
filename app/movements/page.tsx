'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function MovementsPage() {
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('remitos').select('*, warehouses!remitos_origin_id_fkey(name), warehouses_dest:warehouses!remitos_destination_id_fkey(name)').order('created_at', { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, [supabase]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Movimientos / Remitos</h1><Link href="/movements/new" className="btn">Nuevo remito</Link></div>
      <div className="card overflow-auto">
        <table className="table"><thead><tr className="text-left text-white/70"><th>Número</th><th>Origen</th><th>Destino</th><th>Estado</th><th>Fecha</th><th /></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-white/10"><td>{row.number}</td><td>{row.warehouses?.name}</td><td>{row.warehouses_dest?.name}</td><td>{row.status}</td><td>{new Date(row.created_at).toLocaleDateString()}</td><td><Link href={`/movements/${row.id}`} className="btn">Ver</Link></td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
