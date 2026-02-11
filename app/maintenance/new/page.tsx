'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function NewWorkOrderPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [tools, setTools] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('tools').select('id, code, description').then(({ data }) => setTools(data ?? []));
  }, [supabase]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await supabase.from('work_orders').insert({
      title: form.get('title'),
      tool_id: form.get('tool_id'),
      status: 'open',
      description: form.get('description'),
    });
    router.push('/maintenance');
  };

  return (
    <section className="card max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">Nueva OT</h1>
      <form className="space-y-3" onSubmit={onSubmit}>
        <input className="input" name="title" placeholder="Título" required />
        <select className="input" name="tool_id" required>{tools.map((tool) => <option key={tool.id} value={tool.id}>{tool.code} - {tool.description}</option>)}</select>
        <textarea className="input" name="description" placeholder="Descripción" />
        <button className="btn" type="submit">Crear OT</button>
      </form>
    </section>
  );
}
