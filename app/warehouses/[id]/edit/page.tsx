'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function EditWarehousePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [warehouse, setWarehouse] = useState<any>(null);

  useEffect(() => {
    supabase.from('warehouses').select('*').eq('id', id).single().then(({ data }) => setWarehouse(data));
  }, [id, supabase]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await supabase.from('warehouses').update({
      name: form.get('name'),
      type: form.get('type'),
      notes: form.get('notes'),
    }).eq('id', id);
    router.push('/warehouses');
  };

  if (!warehouse) return <div className="card">Cargando...</div>;

  return (
    <section className="card max-w-xl space-y-4">
      <h1 className="text-xl font-bold">Editar depósito</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="input" name="name" defaultValue={warehouse.name} required />
        <select className="input" name="type" defaultValue={warehouse.type}>
          <option value="field_team">Equipo de campo</option>
          <option value="maintenance_center">Almacén central de mantenimiento</option>
          <option value="other">Otro</option>
        </select>
        <textarea className="input" name="notes" defaultValue={warehouse.notes ?? ''} />
        <button className="btn" type="submit">Guardar</button>
      </form>
    </section>
  );
}
