'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function NewToolPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.from('warehouses').select('id, name').then(({ data }) => setWarehouses(data ?? []));
  }, [supabase]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await supabase.from('tools').insert({
      code: form.get('code'),
      description: form.get('description'),
      warehouse_id: form.get('warehouse_id'),
      usage_hours: Number(form.get('usage_hours') ?? 0),
      next_maintenance_hours: Number(form.get('next_maintenance_hours') ?? 100),
      status: form.get('status'),
    });
    router.push('/inventory');
  };

  return (
    <section className="card max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">Nueva herramienta</h1>
      <form className="space-y-3" onSubmit={onSubmit}>
        <input className="input" name="code" placeholder="Código interno" required />
        <input className="input" name="description" placeholder="Descripción" required />
        <select className="input" name="status" defaultValue="available">
          <option value="available">available</option><option value="in_use">in_use</option><option value="maintenance">maintenance</option><option value="retired">retired</option>
        </select>
        <select className="input" name="warehouse_id" required>
          {warehouses.map((warehouse) => <option value={warehouse.id} key={warehouse.id}>{warehouse.name}</option>)}
        </select>
        <input className="input" name="usage_hours" type="number" min="0" defaultValue={0} />
        <input className="input" name="next_maintenance_hours" type="number" min="0" defaultValue={100} />
        <button className="btn" type="submit">Guardar</button>
      </form>
    </section>
  );
}
