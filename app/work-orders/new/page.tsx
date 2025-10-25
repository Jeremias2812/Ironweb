'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

// Types
interface Technician { id: string; name: string; email: string }

export default function NewWorkOrderPage() {
  const supabase = createClient();
  const router = useRouter();

  // Shared state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Client
  const [client, setClient] = useState('');
  const [clientsList, setClientsList] = useState<string[]>([]);

  // Part (existing or new)
  const [useExistingPart, setUseExistingPart] = useState(true);
  const [partCode, setPartCode] = useState('');
  const [partType, setPartType] = useState('');
  const [availablePartCodes, setAvailablePartCodes] = useState<string[]>([]);
  // Multi-select (existing parts)
  const [selectedPartCodes, setSelectedPartCodes] = useState<string[]>([]);

  // Service
  const [serviceType, setServiceType] = useState('general');
  const [priority, setPriority] = useState('normal');
  const [description, setDescription] = useState('');
  const [etaHours, setEtaHours] = useState<number>(8);

  // Assignment
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [assignedTo, setAssignedTo] = useState('');

  const serviceTypes = useMemo(() => [
    { v: 'general', l: 'General' },
    { v: 'inspeccion', l: 'Inspección' },
    { v: 'reparacion', l: 'Reparación' },
    { v: 'calibracion', l: 'Calibración' },
    { v: 'otro', l: 'Otro' },
  ], []);

  const priorities = useMemo(() => ['alta', 'normal', 'baja'], []);

  // Load initial data (clients + technicians)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      // Clients (prefer table clients; otherwise distinct from parts)
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('name')
          .order('name', { ascending: true });
        if (!error && data) {
          setClientsList((data as any[]).map(r => r.name).filter(Boolean));
        } else {
          // fallback
          const { data: pData } = await supabase
            .from('parts')
            .select('client')
            .not('client', 'is', null);
          const uniq = Array.from(new Set((pData ?? []).map((r: any) => r.client).filter(Boolean)))
            .sort((a, b) => String(a).localeCompare(String(b)));
          setClientsList(uniq);
        }
      } catch {
        // ignore
      }

      // Technicians
      const { data: techs, error: eTech } = await supabase
        .from('app_users')
        .select('auth_user_id, full_name, email, role')
        .in('role', ['technician']);
      if (!eTech && techs) {
        const tlist = (techs as any[]).map(t => ({
          id: t.auth_user_id as string,
          name: (t.full_name as string) || (t.email as string),
          email: t.email as string,
        }));
        setTechnicians(tlist);
      }

      setLoading(false);
    };
    load();
  }, [supabase]);

  // Load part codes when client changes (for existing-part flow)
  useEffect(() => {
    let active = true;
    const run = async () => {
      setError(null);
      if (!client.trim()) { setAvailablePartCodes([]); return; }
      const { data, error } = await supabase
        .from('parts')
        .select('code')
        .eq('client', client.trim())
        .order('code', { ascending: true });
      if (!active) return;
      if (error) { setAvailablePartCodes([]); return; }
      const uniq = Array.from(new Set((data ?? []).map((r: any) => r.code).filter(Boolean)));
      setAvailablePartCodes(uniq);
    };
    const t = setTimeout(run, 250);
    return () => { active = false; clearTimeout(t); };
  }, [client, supabase]);

  // Reset part code and selected list when client changes
  useEffect(() => { setPartCode(''); setSelectedPartCodes([]); }, [client]);

  const validate = () => {
    if (!client.trim()) return 'El cliente es obligatorio';
    if (useExistingPart) {
      if (selectedPartCodes.length === 0) return 'Agregá al menos una pieza existente';
    } else {
      if (!partCode.trim()) return 'Ingresá el código de la nueva pieza';
    }
    if (!description.trim()) return 'Describí el trabajo a realizar';
    return null;
  };

  const addExistingPartCode = () => {
    const code = partCode.trim();
    if (!code) return;
    if (!availablePartCodes.includes(code)) return; // must be from list (same client)
    if (selectedPartCodes.includes(code)) return;
    setSelectedPartCodes(prev => [...prev, code]);
    setPartCode('');
  };

  const removeExistingPartCode = (code: string) => {
    setSelectedPartCodes(prev => prev.filter(c => c !== code));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null); setOk(null);

    const v = validate();
    if (v) { setError(v); return; }

    setSubmitting(true);

    // 1) Ensure client exists (best-effort)
    try {
      if (client.trim()) {
        await supabase.from('clients').upsert({ name: client.trim() }, { onConflict: 'name' });
      }
    } catch {/* ignore if table missing */}

    // We'll support multiple parts. Collect part IDs here.
    const partIds: string[] = [];

    try {
      if (useExistingPart) {
        // 2a) Resolve existing parts in a single query
        const codes = selectedPartCodes.map(c => c.trim()).filter(Boolean);
        const { data: partsFound, error: eP } = await supabase
          .from('parts')
          .select('id, code, client')
          .eq('client', client.trim())
          .in('code', codes);
        if (eP) throw eP;

        const foundMap = new Map((partsFound ?? []).map((r: any) => [r.code, r.id]));
        const missing = codes.filter(c => !foundMap.has(c));
        if (missing.length) throw new Error(`No existen las piezas seleccionadas: ${missing.join(', ')}`);

        codes.forEach(c => partIds.push(foundMap.get(c)!));
      } else {
        // 2b) Create new part (single) and include it
        const codeUp = partCode.trim().toUpperCase();
        const { data: exists } = await supabase
          .from('parts')
          .select('id')
          .eq('code', codeUp)
          .eq('client', client.trim())
          .maybeSingle();
        if (exists?.id) throw new Error(`Ya existe la pieza "${codeUp}" para el cliente "${client}"`);

        const { data: np, error: eNP } = await supabase
          .from('parts')
          .insert({ code: codeUp, type: partType.trim() || null, client: client.trim(), status: 'received' })
          .select('id')
          .single();
        if (eNP) throw eNP;
        partIds.push(np!.id as string);
      }

      // 3) Create one service per part
      const serviceIds: string[] = [];
      for (const pid of partIds) {
        const { data: svc, error: eSvc } = await supabase
          .from('services')
          .insert({
            part_id: pid,
            service_type: serviceType,
            priority,
            status: 'pending',
          })
          .select('id')
          .single();
        if (eSvc) throw eSvc;
        serviceIds.push(svc!.id as string);
      }

      // 4) Create work order, keep backward-compat by attaching the first service
      const { data: wo, error: eWO } = await supabase
        .from('work_orders')
        .insert({
          service_id: serviceIds[0],  // legacy link
          status: 'planned',
          eta_hours: etaHours || null,
          assigned_to: assignedTo || null,
        })
        .select('id')
        .single();
      if (eWO) throw eWO;

      // 5) If bridge table exists, link all services to this WO (best effort)
      for (const sid of serviceIds) {
        const ins = await supabase
          .from('work_order_services')
          .insert({ work_order_id: wo!.id as string, service_id: sid });
        // If table doesn't exist or policy blocks, ignore to keep legacy working
        if (ins.error && ins.error.code !== '42P01') {
          // other DB error: surface it
          throw ins.error;
        }
      }

      setOk('Orden creada con éxito');
      router.push('/work-orders');
    } catch (err: any) {
      setError(err?.message || 'Error creando la orden');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nueva orden de trabajo</h1>

      {error && <div className="card text-red-300">{error}</div>}
      {ok && <div className="card text-green-300">{ok}</div>}

      {loading ? (
        <div className="card p-4">Cargando…</div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-6">
          {/* Cliente */}
          <section className="card grid md:grid-cols-3 gap-3">
            <h2 className="md:col-span-3 font-semibold">Cliente</h2>
            <div className="md:col-span-2">
              <input
                className="input"
                placeholder="Cliente *"
                value={client}
                onChange={e => setClient(e.target.value)}
                list="clientsList"
                disabled={submitting}
              />
              <datalist id="clientsList">
                {clientsList.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div />
          </section>

          {/* Pieza */}
          <section className="card grid md:grid-cols-3 gap-3">
            <h2 className="md:col-span-3 font-semibold">Pieza</h2>

            <div className="md:col-span-3 flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input type="radio" name="partMode" checked={useExistingPart} onChange={() => setUseExistingPart(true)} />
                <span>Usar pieza existente</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="partMode" checked={!useExistingPart} onChange={() => setUseExistingPart(false)} />
                <span>Crear pieza nueva</span>
              </label>
            </div>

            {useExistingPart ? (
              <>
                <div className="md:col-span-2">
                  <input
                    className="input"
                    placeholder={client.trim() ? 'Código de pieza (escribí y elegí de la lista)' : 'Selecciona cliente primero'}
                    value={partCode}
                    onChange={e => setPartCode(e.target.value)}
                    list="partsList"
                    disabled={!client.trim() || submitting}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExistingPartCode(); } }}
                  />
                  <datalist id="partsList">
                    {availablePartCodes.map(pc => <option key={pc} value={pc} />)}
                  </datalist>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="btn" onClick={addExistingPartCode} disabled={!client.trim() || submitting || !partCode.trim()}>
                      Agregar pieza
                    </button>
                  </div>
                  {!!selectedPartCodes.length && (
                    <div className="mt-3">
                      <div className="text-xs opacity-80 mb-1">Piezas seleccionadas:</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedPartCodes.map(code => (
                          <span key={code} className="inline-flex items-center gap-2 border border-white/20 rounded px-2 py-1 text-sm">
                            {code}
                            <button type="button" className="btn btn-ghost text-red-300 px-2 py-0" onClick={() => removeExistingPartCode(code)}>×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div />
              </>
            ) : (
              <>
                <div>
                  <input
                    className="input"
                    placeholder="Código de nueva pieza *"
                    value={partCode}
                    onChange={e => setPartCode(e.target.value)}
                    disabled={submitting}
                  />
                  <p className="text-xs opacity-70 mt-1">Se guardará en MAYÚSCULAS</p>
                </div>
                <div>
                  <input
                    className="input"
                    placeholder="Tipo (opcional)"
                    value={partType}
                    onChange={e => setPartType(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="md:col-span-3 text-xs opacity-70">
                  Para varias piezas nuevas, crealas una por vez o cargalas primero en "Piezas" y luego usá "Usar pieza existente".
                </div>
                <div />
              </>
            )}
          </section>

          {/* Servicio */}
          <section className="card grid md:grid-cols-3 gap-3">
            <h2 className="md:col-span-3 font-semibold">Servicio</h2>
            <div>
              <label className="text-sm opacity-70">Tipo</label>
              <select className="input mt-1" value={serviceType} onChange={e => setServiceType(e.target.value)} disabled={submitting}>
                {serviceTypes.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm opacity-70">Prioridad</label>
              <select className="input mt-1" value={priority} onChange={e => setPriority(e.target.value)} disabled={submitting}>
                {priorities.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm opacity-70">ETA (horas)</label>
              <input className="input mt-1" type="number" min={1} value={etaHours} onChange={e => setEtaHours(parseInt(e.target.value||'0',10))} disabled={submitting} />
            </div>
            <div className="md:col-span-3">
              <label className="text-sm opacity-70">Trabajo a realizar</label>
              <textarea className="input mt-1" rows={4} placeholder="Describe el alcance del servicio" value={description} onChange={e => setDescription(e.target.value)} disabled={submitting} />
            </div>
          </section>

          {/* Asignación */}
          <section className="card grid md:grid-cols-3 gap-3">
            <h2 className="md:col-span-3 font-semibold">Asignación</h2>
            <div className="md:col-span-2">
              <select className="input" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} disabled={submitting}>
                <option value="">— Técnico (opcional) —</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                ))}
              </select>
            </div>
            <div />
          </section>

          {/* Crear */}
          <div className="flex items-center gap-3">
            <button className="btn" type="submit" disabled={submitting}>{submitting ? 'Creando…' : 'Crear orden'}</button>
            <button className="btn" type="button" onClick={() => router.push('/work-orders')} disabled={submitting}>Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
}
