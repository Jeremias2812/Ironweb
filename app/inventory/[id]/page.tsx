'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function ToolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = getSupabaseBrowserClient();
  const [tool, setTool] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('tools').select('*').eq('id', id).single().then(({ data }) => setTool(data));
    supabase.from('tool_movements').select('*, remitos(number)').eq('tool_id', id).order('created_at', { ascending: false }).then(({ data }) => setMovements(data ?? []));
    supabase.from('maintenance_logs').select('*, work_orders(title)').eq('tool_id', id).order('created_at', { ascending: false }).then(({ data }) => setLogs(data ?? []));
  }, [id, supabase]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Detalle herramienta</h1>
        <Link href={`/inventory/${id}/edit`} className="btn">Editar</Link>
      </div>
      <article className="card"><pre>{JSON.stringify(tool, null, 2)}</pre></article>
      <article className="card"><h2 className="font-semibold mb-2">Historial de movimientos</h2><pre>{JSON.stringify(movements, null, 2)}</pre></article>
      <article className="card"><h2 className="font-semibold mb-2">Historial de mantenimiento</h2><pre>{JSON.stringify(logs, null, 2)}</pre></article>
    </section>
  );
}
