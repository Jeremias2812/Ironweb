'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

// Types
type Part = {
  id: string;
  numero_parte: string | null;
  numero_serie: string | null;
  internal_code: string | null;
  type: string | null;
  brand: string | null;
  client: string | null;
  status: string | null;
  created_at: string;
};

export default function PartsPage() {
  const supabase = createClient();

  // Data
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorLoad, setErrorLoad] = useState<string | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  // Submission & helpers
  const [submitting, setSubmitting] = useState(false);
  const [clientsList, setClientsList] = useState<string[]>([]);

  // Form fields
  const [numeroParte, setNumeroParte] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [internalCode, setInternalCode] = useState('');
  const [type, setType] = useState('');
  const [brand, setBrand] = useState('');
  const [client, setClient] = useState('');

  // Catálogo de tipos (part_types)
  const [typesList, setTypesList] = useState<{ slug: string; label: string }[]>([]);

  // Filters (search)
  const [searchParte, setSearchParte] = useState('');
  const [searchClient, setSearchClient] = useState('');

  // Pagination
  const pageSize = 20;
  const [page, setPage] = useState(1); // 1-based
  const [total, setTotal] = useState(0);

  // Derived
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  // Load clients list (table `clients` -> fallback distinct from parts)
  useEffect(() => {
    const loadClients = async () => {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('name')
          .order('name', { ascending: true });
        if (!error && data) {
          setClientsList((data as any[]).map((r) => r.name).filter(Boolean));
          return;
        }
      } catch {}
      // fallback distinct from parts
      const { data: pData } = await supabase
        .from('parts')
        .select('client')
        .not('client', 'is', null);
      const uniq = Array.from(new Set((pData ?? []).map((r: any) => r.client).filter(Boolean)))
        .sort((a, b) => String(a).localeCompare(String(b)));
      setClientsList(uniq as string[]);
    };
    loadClients();
  }, [supabase]);

  // Carga catálogo de tipos desde part_types (slug, label)
  useEffect(() => {
    const run = async () => {
      try {
        const { data, error } = await supabase
          .from('part_types')
          .select('slug,label')
          .order('label');
        if (!error && data) setTypesList(data as any);
      } catch {
        // noop: si falla, el "Tipo" seguirá permitiendo texto libre (pero lo normal es que exista)
      }
    };
    run();
  }, [supabase]);

  // Load parts (with filters & pagination)
  const load = async () => {
    setLoading(true);
    setErrorLoad(null);

    // Build base query for count and data
    let base = supabase
      .from('parts')
      .select('id, numero_parte, numero_serie, internal_code, type, brand, client, status, created_at', { count: 'exact' });

    // Filters
    if (searchClient.trim()) base = base.ilike('client', `%${searchClient.trim()}%`);
    if (searchParte.trim()) base = base.ilike('numero_parte', `%${searchParte.trim()}%`);

    // Clone for count head-only
    const countQuery = supabase
      .from('parts')
      .select('id', { count: 'exact', head: true });
    let countQ = countQuery;
    if (searchClient.trim()) countQ = countQ.ilike('client', `%${searchClient.trim()}%`);
    if (searchParte.trim()) countQ = countQ.ilike('numero_parte', `%${searchParte.trim()}%`);

    // Range for data
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const dataQuery = base.order('created_at', { ascending: false }).range(from, to);

    const [cnt, dat] = await Promise.all([
      countQ,
      dataQuery,
    ]);

    if (cnt.error) setErrorLoad(cnt.error.message);
    if (dat.error) setErrorLoad(dat.error.message);

    setTotal(cnt.count ?? 0);
    setParts((dat.data ?? []) as Part[]);
    setLoading(false);
  };

  // Initial & whenever filters/page change
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, searchParte, searchClient]);

  // Add part
  const addPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorForm(null);

    // Normalize
    const tNumeroParte = numeroParte.trim().toUpperCase();
    const tNumeroSerie = numeroSerie.trim();
    const tInternalCode = internalCode.trim();
    const tType = type.trim();
    const tBrand = brand.trim();
    const tClient = client.trim();

    if (!tNumeroParte) { setErrorForm('El número de parte es obligatorio'); return; }
    if (!tClient) { setErrorForm('El cliente es obligatorio'); return; }

    setSubmitting(true);

    // Client upsert (best effort)
    try {
      if (tClient) {
        await supabase.from('clients').upsert({ name: tClient }, { onConflict: 'name' });
      }
    } catch { /* ignore if table not exists */ }

    // Duplicate check (numero_parte + client)
    const { data: exists, error: eFind } = await supabase
      .from('parts')
      .select('id')
      .eq('numero_parte', tNumeroParte)
      .eq('client', tClient)
      .maybeSingle();
    if (eFind) { setErrorForm(eFind.message); setSubmitting(false); return; }
    if (exists?.id) {
      setErrorForm(`Ya existe la pieza "${tNumeroParte}" para el cliente "${tClient}"`);
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from('parts').insert({
      numero_parte: tNumeroParte,
      numero_serie: tNumeroSerie || null,
      internal_code: tInternalCode || null,
      type: tType || null,
      brand: tBrand || null,
      client: tClient || null,
      status: 'recibida',
    });

    if (error) {
      // 23505 = unique_violation (por si aplicaste constraint único en DB)
      // @ts-ignore
      if (error.code === '23505') {
        setErrorForm(`Ya existe la pieza "${tNumeroParte}" para el cliente "${tClient}"`);
      } else {
        setErrorForm(error.message);
      }
      setSubmitting(false);
      return;
    }

    setNumeroParte('');
    setNumeroSerie('');
    setInternalCode('');
    setType('');
    setBrand('');
    setClient('');
    setPage(1); // volver a la primera página
    await load();
    setSubmitting(false);
  };

  // Delete part
  const removePart = async (id: string) => {
    setErrorLoad(null);
    const { error } = await supabase.from('parts').delete().eq('id', id);
    if (error) setErrorLoad(error.message);
    else setParts(prev => prev.filter(p => p.id !== id));
  };

  // Pagination controls
  const prevPage = () => setPage(p => Math.max(1, p - 1));
  const nextPage = () => setPage(p => Math.min(totalPages, p + 1));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Piezas</h1>

      {/* Filtros de búsqueda */}
      <div className="card grid md:grid-cols-4 gap-3">
        <input
          className="input"
          placeholder="Buscar por N° parte"
          value={searchParte}
          onChange={e => { setSearchParte(e.target.value); setPage(1); }}
        />
        <input
          className="input"
          placeholder="Buscar por cliente"
          value={searchClient}
          onChange={e => { setSearchClient(e.target.value); setPage(1); }}
          list="clientsList"
        />
        {/* filler to align */}
        <div className="hidden md:block" />
        <div className="hidden md:block" />
      </div>

      {/* Formulario para agregar */}
      <form onSubmit={addPart} className="card grid md:grid-cols-4 gap-3">
        <input
          className="input"
          placeholder="N° de parte *"
          value={numeroParte}
          onChange={e => setNumeroParte(e.target.value)}
          disabled={submitting}
        />
        <input
          className="input"
          placeholder="N° de serie"
          value={numeroSerie}
          onChange={e => setNumeroSerie(e.target.value)}
          disabled={submitting}
        />
        <input
          className="input"
          placeholder="Identificador interno"
          value={internalCode}
          onChange={e => setInternalCode(e.target.value)}
          disabled={submitting}
        />
        <select
          className="input"
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={submitting}
        >
          <option value="">— Tipo —</option>
          {typesList.map(t => (
            <option key={t.slug} value={t.slug}>{t.label}</option>
          ))}
        </select>
        <input
          className="input"
          placeholder="Marca"
          value={brand}
          onChange={e => setBrand(e.target.value)}
          disabled={submitting}
        />
        <input
          className="input"
          placeholder="Cliente *"
          value={client}
          onChange={e => setClient(e.target.value)}
          list="clientsList"
          disabled={submitting}
        />
        <datalist id="clientsList">
          {clientsList.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <button className="btn" type="submit" disabled={submitting}>{submitting ? 'Agregando…' : 'Agregar'}</button>
        {errorForm && (
          <p className="md:col-span-4 text-sm text-red-300">{errorForm}</p>
        )}
      </form>

      {/* Tabla de piezas */}
      <div className="card">
        {loading ? (
          <p>Cargando…</p>
        ) : errorLoad ? (
          <p className="text-red-300">Error: {errorLoad}</p>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr className="text-left">
                  <th>N° parte</th>
                  <th>N° serie</th>
                  <th>Identificador interno</th>
                  <th>Tipo</th>
                  <th>Marca</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th>Creada</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {parts.map(p => (
                  <tr key={p.id} className="border-t border-white/10">
                    <td>{p.numero_parte ?? '-'}</td>
                    <td>{p.numero_serie ?? '-'}</td>
                    <td>{p.internal_code ?? '-'}</td>
                    <td>{p.type ?? '-'}</td>
                    <td>{p.brand ?? '-'}</td>
                    <td>{p.client ?? '-'}</td>
                    <td>{p.status ?? '-'}</td>
                    <td>{new Date(p.created_at).toLocaleString()}</td>
                    <td>
                      <button className="btn" onClick={() => removePart(p.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
                {parts.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-4 text-white/60">
                      Sin piezas aún. Agrega una arriba.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-white/60">
                Página {page} de {totalPages} · {total} registros
              </div>
              <div className="flex gap-2">
                <button className="btn" onClick={prevPage} disabled={page<=1}>Anterior</button>
                <button className="btn" onClick={nextPage} disabled={page>=totalPages}>Siguiente</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}