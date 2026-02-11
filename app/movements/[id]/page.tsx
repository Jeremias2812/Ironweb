'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function MovementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [remito, setRemito] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('remitos').select('*').eq('id', id).single().then(({ data }) => setRemito(data));
    supabase.from('remito_lines').select('*, tools(code, description)').eq('remito_id', id).then(({ data }) => setLines(data ?? []));
  }, [id, supabase]);

  const closeRemito = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.rpc('close_remito', { p_remito_id: id, p_user_id: userData.user.id });
    router.refresh();
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Detalle remito</h1>
      <div className="card"><pre>{JSON.stringify(remito, null, 2)}</pre></div>
      <div className="card"><pre>{JSON.stringify(lines, null, 2)}</pre></div>
      {remito?.status === 'draft' && <button className="btn" onClick={closeRemito}>Cerrar remito (RPC)</button>}
    </section>
  );
}
