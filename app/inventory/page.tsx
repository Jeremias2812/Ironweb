'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

type ToolRow = {
  id: string;
  code: string;
  description: string;
  status: 'available' | 'in_use' | 'maintenance' | 'retired';
  usage_hours: number;
  next_maintenance_hours: number;
  warehouses?: { name: string }[] | null;
};

export default function InventoryPage() {
  const supabase = getSupabaseBrowserClient();
  const [tools, setTools] = useState<ToolRow[]>([]);

  useEffect(() => {
    supabase
      .from('tools')
      .select('id, code, description, status, usage_hours, next_maintenance_hours, warehouses(name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setTools((data ?? []) as unknown as ToolRow[]));

    const channel = supabase
      .channel('tools-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tools' }, () => {
        supabase
          .from('tools')
          .select('id, code, description, status, usage_hours, next_maintenance_hours, warehouses(name)')
          .then(({ data }) => setTools((data ?? []) as unknown as ToolRow[]));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventario</h1>
        <Link href="/inventory/new" className="btn">Nueva herramienta</Link>
      </div>
      <div className="card overflow-auto">
        <table className="table">
          <thead>
            <tr className="text-left text-white/70">
              <th>Código</th><th>Descripción</th><th>Estado</th><th>Ubicación</th><th>Horas</th><th>Próx. mant.</th><th />
            </tr>
          </thead>
          <tbody>
            {tools.map((tool) => (
              <tr key={tool.id} className="border-t border-white/10">
                <td>{tool.code}</td>
                <td>{tool.description}</td>
                <td>{tool.status}</td>
                <td>{tool.warehouses?.[0]?.name ?? '-'}</td>
                <td>{tool.usage_hours}</td>
                <td>{tool.next_maintenance_hours}</td>
                <td><Link href={`/inventory/${tool.id}`} className="btn">Ver</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
