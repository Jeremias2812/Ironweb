'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function EditToolPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [tool, setTool] = useState<any>(null);

  useEffect(() => {
    supabase.from('tools').select('*').eq('id', id).single().then(({ data }) => setTool(data));
  }, [id, supabase]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await supabase.from('tools').update({
      description: form.get('description'),
      status: form.get('status'),
      usage_hours: Number(form.get('usage_hours') ?? 0),
      next_maintenance_hours: Number(form.get('next_maintenance_hours') ?? 0),
    }).eq('id', id);
    router.push(`/inventory/${id}`);
  };

  if (!tool) return <div className="card">Cargando...</div>;

  return (
    <section className="card max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">Editar herramienta</h1>
      <form className="space-y-3" onSubmit={onSubmit}>
        <input className="input" defaultValue={tool.description} name="description" required />
        <select className="input" defaultValue={tool.status} name="status">
          <option value="available">available</option><option value="in_use">in_use</option><option value="maintenance">maintenance</option><option value="retired">retired</option>
        </select>
        <input className="input" defaultValue={tool.usage_hours} name="usage_hours" type="number" min="0" />
        <input className="input" defaultValue={tool.next_maintenance_hours} name="next_maintenance_hours" type="number" min="0" />
        <button className="btn" type="submit">Guardar cambios</button>
      </form>
    </section>
  );
}
