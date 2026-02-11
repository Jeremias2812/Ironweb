'use client';

import { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function NewWarehousePage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await supabase.from('warehouses').insert({
      name: form.get('name'),
      type: form.get('type'),
      notes: form.get('notes'),
    });
    router.push('/warehouses');
  };

  return (
    <section className="card max-w-xl space-y-4">
      <h1 className="text-xl font-bold">Nuevo depósito</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="input" name="name" placeholder="Nombre" required />
        <select className="input" name="type">
          <option value="field_team">Equipo de campo</option>
          <option value="maintenance_center">Almacén central de mantenimiento</option>
          <option value="other">Otro</option>
        </select>
        <textarea className="input" name="notes" placeholder="Notas" />
        <button className="btn" type="submit">Guardar</button>
      </form>
    </section>
  );
}
