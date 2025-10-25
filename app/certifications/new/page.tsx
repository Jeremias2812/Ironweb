'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

export default function NewCertificationPage() {
  const supabase = createClient();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [customer, setCustomer] = useState('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  const save = async () => {
    setSaving(true); setErr(null);
    const { data, error } = await supabase
      .from('certifications')
      .insert({ title, customer, date, notes, status: 'draft' })
      .select('id')
      .single();
    setSaving(false);
    if (error) { setErr(error.message); return; }
    router.push(`/certifications/${data!.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nueva certificación</h1>
        <Link className="btn" href="/certifications">Volver</Link>
      </div>

      {err && <div className="card text-red-300">{err}</div>}

      <div className="card grid md:grid-cols-2 gap-3">
        <input className="input" placeholder="Título" value={title} onChange={e=>setTitle(e.target.value)} />
        <input className="input" placeholder="Cliente" value={customer} onChange={e=>setCustomer(e.target.value)} />
        <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
        <textarea className="input md:col-span-2" placeholder="Notas" value={notes} onChange={e=>setNotes(e.target.value)} />
        <div className="md:col-span-2 flex justify-end">
          <button className="btn" onClick={save} disabled={saving || !title || !customer}>
            {saving ? 'Creando…' : 'Crear certificación'}
          </button>
        </div>
      </div>
    </div>
  );
}