'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function NewMovementPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [warehouses, setWarehouses] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('warehouses').select('id, name').then(({ data }) => setWarehouses(data ?? []));
  }, [supabase]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const { data: remito } = await supabase.from('remitos').insert({
      number: form.get('number'),
      origin_id: form.get('origin_id'),
      destination_id: form.get('destination_id'),
      status: 'draft',
    }).select('id').single();

    if (remito) {
      const linesRaw = String(form.get('lines') ?? '').split('\n').map((line) => line.trim()).filter(Boolean);
      const lines = linesRaw.map((line) => {
        const [toolId, delta] = line.split(',');
        return { remito_id: remito.id, tool_id: toolId, usage_delta: Number(delta ?? 0) };
      });
      if (lines.length) {
        await supabase.from('remito_lines').insert(lines);
      }
    }

    router.push('/movements');
  };

  return (
    <section className="card max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">Nuevo remito</h1>
      <form className="space-y-3" onSubmit={onSubmit}>
        <input className="input" name="number" placeholder="Número de remito" required />
        <select className="input" name="origin_id" required>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select>
        <select className="input" name="destination_id" required>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select>
        <textarea className="input" name="lines" placeholder="tool_id,usage_delta (una línea por herramienta)" rows={6} />
        <button className="btn" type="submit">Guardar draft</button>
      </form>
    </section>
  );
}
