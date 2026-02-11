'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = getSupabaseBrowserClient();
  const [wo, setWo] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  const load = async () => {
    const woRes = await supabase.from('work_orders').select('*, tools(*)').eq('id', id).single();
    const logsRes = await supabase.from('maintenance_logs').select('*').eq('work_order_id', id).order('created_at', { ascending: false });
    setWo(woRes.data);
    setLogs(logsRes.data ?? []);
  };

  useEffect(() => { load(); }, [id]);

  const setStatus = async (status: 'open' | 'in_progress' | 'closed') => {
    await supabase.rpc('set_work_order_status', { p_wo_id: id, p_status: status });
    await load();
  };

  const addLog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await supabase.from('maintenance_logs').insert({
      work_order_id: id,
      tool_id: wo.tool_id,
      note: form.get('note'),
      hours_spent: Number(form.get('hours_spent') ?? 0),
    });
    (event.currentTarget as HTMLFormElement).reset();
    await load();
  };

  if (!wo) return <div className="card">Cargando...</div>;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">OT {wo.title}</h1>
      <div className="card space-y-2">
        <p>Estado actual: <strong>{wo.status}</strong></p>
        <div className="flex gap-2">
          <button className="btn" onClick={() => setStatus('open')}>open</button>
          <button className="btn" onClick={() => setStatus('in_progress')}>in_progress</button>
          <button className="btn" onClick={() => setStatus('closed')}>closed</button>
        </div>
      </div>
      <form onSubmit={addLog} className="card space-y-3">
        <h2 className="font-semibold">Agregar log de mantenimiento</h2>
        <textarea name="note" className="input" placeholder="Nota" required />
        <input name="hours_spent" className="input" type="number" min="0" step="0.5" defaultValue={1} />
        <button type="submit" className="btn">Guardar log</button>
      </form>
      <article className="card"><pre>{JSON.stringify(logs, null, 2)}</pre></article>
    </section>
  );
}
