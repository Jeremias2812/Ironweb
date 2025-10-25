'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReportPrintView from '@/components/reports/ReportPrint';
import StepNav from '@/components/reports/StepNav';
import MethodsTable from '@/components/reports/MethodsTable';
import CertificateBox from '@/components/reports/CertificateBox';

import ActionsBar from './components/ActionsBar';
import HeaderForm from './components/HeaderForm';
import UTSectionSmart from './components/UTSectionSmart';
import TestsPanel from './components/TestsPanel';
import EquipmentForm from './components/EquipmentForm';
import AttachmentsAndSignature from './components/AttachmentsAndSignature';


// Fábrica local de Supabase (evita '@/lib/supabase/client')
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let __supabaseSingleton: ReturnType<typeof createSupabaseClient> | null = null;
function createClient() {
  if (__supabaseSingleton) return __supabaseSingleton;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  if (!url || !anon) {
    throw new Error('Faltan variables NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  __supabaseSingleton = createSupabaseClient(url, anon);
  return __supabaseSingleton;
}

// ---- Constantes auxiliares ----
type ViewMode = 'edit' | 'view';

type MethodRow = {
  method: string;
  result: 'approved' | 'rejected' | 'na';
  acceptance: string;
  notes: string;
};

const METHOD_LABELS: Record<string, string> = {
  visual: 'Inspección visual',
  pm: 'Partículas magnéticas',
  ut: 'Ultrasonido (espesores)',
  hydro: 'Prueba hidrostática',
  functional: 'Prueba funcional',
  lp: 'Líquidos penetrantes',
  gauges: 'Calibres / Galgas',
};

// Storage bucket para adjuntos (configurable via env)
const REPORTS_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_REPORTS_BUCKET || 'reports';

// Helper: empty string -> null (useful for nullable DATE/TEXT columns)
const toNull = (v: any) => {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  return v;
};


// ---- Tipos de datos ----
type UtPoint = { point: string; min_mm: number | '' | undefined; actual_mm: number | '' | undefined };
// --- Adaptadores de tipos para UTSectionSmart (que usa strings) ---
// Tipo que espera el hijo (UTSectionSmart)
type UtPointChild = { point: string; min_mm: string; actual_mm: string };

const toChildPoints = (arr: UtPoint[]): UtPointChild[] =>
  arr.map(p => ({
    point: p.point,
    min_mm: p.min_mm === '' || p.min_mm === undefined ? '' : String(p.min_mm),
    actual_mm: p.actual_mm === '' || p.actual_mm === undefined ? '' : String(p.actual_mm),
  }));

const fromChildPoints = (arr: UtPointChild[]): UtPoint[] =>
  arr.map(p => ({
    point: p.point,
    min_mm: p.min_mm === '' ? '' : (isFinite(Number(p.min_mm)) ? Number(p.min_mm) : ''),
    actual_mm: p.actual_mm === '' ? '' : (isFinite(Number(p.actual_mm)) ? Number(p.actual_mm) : ''),
  }));
type TestRow = { test_type: 'hydro'|'functional'|'lp'; applies: boolean; instrument_id?: string; instrument_exp?: string; params?: any; notes?: string };

// ---- Helpers de "páginas" para la vista previa ----
function Page({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="a4-page mx-auto bg-white"
      style={{ width: '210mm', height: '297mm', padding: '10mm 10mm 12mm 10mm' }}
    >
      {children}
    </div>
  );
}

function HeaderBlock({
  logoSrc = '/iron-logo.png',
  reportDate,
  reportNumber,
  workOrderNumber,
  otShort,
  client,
  clientName,
  sector,
  location,
  scope,
  serviceLevel,
  frequency,
  compact = false,
}: {
  logoSrc?: string;
  reportDate: string;
  reportNumber?: string;
  workOrderNumber?: string;
  otShort: string;
  client?: string;
  clientName?: string | null;
  sector?: string;
  location?: string;
  scope?: string;
  serviceLevel?: string;
  frequency?: string;
  compact?: boolean;
}) {
  return (
    <>
      {/* Fila superior: Logo / Título / Datos */}
      <div className={`${compact ? 'mb-3' : 'mb-4'} certificate-header rounded-sm border border-black/70 overflow-hidden`}>
        <div className="grid grid-cols-12 items-stretch">
          {/* Logo */}
          <div className="col-span-2 flex items-center justify-center border-r border-black/70 bg-white">
            <img src={logoSrc} alt="Logo" className="block" style={{ height: '28mm', width: 'auto' }} />
          </div>

          {/* Título centrado */}
          <div className="col-span-6 flex items-center justify-center">
            <div className="text-center font-semibold tracking-wide text-black text-[14px] leading-tight">
              CERTIFICADO DE INSPECCIÓN
            </div>
          </div>

          {/* Datos */}
          <div className="col-span-4 bg-white">
            <div className="h-full border-l border-black/70">
              <div className="px-3 py-1.5 text-[12px] font-semibold bg-gray-300 text-black border-b border-black/40">
                Datos
              </div>
              <div className="p-3 text-[12px] space-y-2">
                <div className="grid grid-cols-3 items-center gap-2">
                  <div className="col-span-1 text-black">Fecha</div>
                  <div className="col-span-2">
                    <div className="border-b border-black/40 leading-4 pb-0.5 text-black">{reportDate || '\u00A0'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 items-center gap-2">
                  <div className="col-span-1 text-black">Informe Nº</div>
                  <div className="col-span-2">
                    <div className="border-b border-black/40 leading-4 pb-0.5 text-black">{reportNumber || '\u00A0'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 items-center gap-2">
                  <div className="col-span-1 text-black">OT Nº</div>
                  <div className="col-span-2">
                    <div className="border-b border-black/40 leading-4 pb-0.5 text-black">{workOrderNumber || otShort}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cabecera detallada (read-only) */}
      <div className={`grid grid-cols-12 ${compact ? 'gap-3' : 'gap-4'}`}>
        <div className="col-span-12">
          <CertificateBox title="Cabecera">
            <div className="grid grid-cols-12 gap-3 text-[12px]">
              <div className="col-span-4">
                <div className="text-black">Cliente</div>
                <div className="border-b border-black/40 leading-4 pb-0.5 text-black">{(client || clientName || '\u00A0') as string}</div>
              </div>
              <div className="col-span-4">
                <div className="text-black">Sector</div>
                <div className="border-b border-black/40 leading-4 pb-0.5 text-black">{(sector || '\u00A0') as string}</div>
              </div>
              <div className="col-span-4">
                <div className="text-black">Lugar</div>
                <div className="border-b border-black/40 leading-4 pb-0.5 text-black">{(location || '\u00A0') as string}</div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-3 mt-2 text-[12px]">
              <div className="col-span-9">
                <div className="text-black">Alcance del servicio</div>
                <div className="border-b border-black/40 leading-4 pb-0.5 text-black">{(scope || '\u00A0') as string}</div>
              </div>
              <div className="col-span-3">
                <div className="text-black">Nivel</div>
                <div className="border-b border-black/40 leading-4 pb-0.5 text-black">{(serviceLevel || '\u00A0') as string}</div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-3 mt-2 text-[12px]">
              <div className="col-span-4">
                <div className="text-black">Frecuencia</div>
                <div className="border-b border-black/40 leading-4 pb-0.5 text-black">{(frequency || '\u00A0') as string}</div>
              </div>
              <div className="col-span-8" />
            </div>
          </CertificateBox>
        </div>
      </div>
    </>
  );
}


// ======================================================
//                     Componente
// ======================================================
export default function ReportsWizardPage() {
  const params = useParams<{ id: string | string[] }>();
  const wid = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const supabase = createClient();
  const search = useSearchParams();
  const isPrint = search?.get('print') === '1';
  const isServerRender = search?.get('server') === '1';
  const isPreview = search?.get('view') === 'preview';

  // Helper para construir hrefs preservando la URL actual
  const makeHref = (params: Record<string, string>) => {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([k, v]) => {
      if (v === '') url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    });
    return `${url.pathname}?${url.searchParams.toString()}`;
  };

  // Lee primero los query params que necesitamos para construir los HREFs
  const serviceIdFromURL = search.get('serviceId');
  const reportIdFromURL = search.get('reportId');

  // --- HREFs para preview y PDF ---
  const resolvedReportId = (typeof reportIdFromURL === 'string' && reportIdFromURL.length > 0) ? reportIdFromURL : null;

  const printHref = resolvedReportId
    ? `/work-orders/${encodeURIComponent(String(wid))}/reports/print?reportId=${encodeURIComponent(resolvedReportId)}&ts=${Date.now()}`
    : makeHref({ view: 'preview', print: '1', ts: String(Date.now()) });


  const otShort = useMemo(() => String(wid).slice(0, 8), [wid]);

  // Paso actual / modo
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<ViewMode>(() =>
    (search?.get('view') === 'preview' || search?.get('print') === '1' ? 'view' : 'edit')
  );

  // Datos de la pieza/OT
  const [partId, setPartId] = useState<string | null>(null);
  const [partCode, setPartCode] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);

  // --- Autofill helpers from Parts ---
  const hydrateFromPartRow = (row: any, opts: { allowPartCode?: boolean } = {}) => {
    const { allowPartCode = true } = opts;
    if (!row) return;

    // Valores normalizados (diversos esquemas)
    const pnValRaw  = String(row.pn ?? row.numero_parte ?? row.part_number ?? '').trim();   // PN real
    const serialVal = String(row.serial ?? row.numero_serie ?? '').trim();                   // Nº de serie real
    const descVal   = String(row.description ?? row.type ?? '').trim();
    const clientVal = String(row.client ?? '').trim();

    // Identificador interno: *solo* desde columnas de identificador (nunca PN).
    // Solo usamos internal_code.
    const rawInternal =
      String(row.internal_code ?? row.internalid ?? row.internal_id ?? row.identificador_interno ?? '')
        .trim();
    const codeVal = rawInternal && rawInternal !== pnValRaw ? rawInternal : '';

    // 1) part_id
    if (row.id && !partId) setPartId(row.id);

    // 2) solo si está permitido y no hay uno ya cargado
    if (allowPartCode && !partCode && codeVal) {
      setPartCode(codeVal);
    }

    // 3) Solo prellenar si están vacíos (no pisar lo escrito por el usuario)
    if (!client && clientVal)      setClient(clientVal);
    if (!description && descVal)   setDescription(descVal);
    if (!pn && pnValRaw)           setPn(pnValRaw);
    if (!serial && serialVal)      setSerial(serialVal);
  };

  // Cabecera (extendida)
  const [reportDate, setReportDate] = useState<string>('');
  const [reportNumber, setReportNumber] = useState<string>('');
  const [workOrderNumber, setWorkOrderNumber] = useState<string>('');
  const [client, setClient] = useState('');
  const [sector, setSector] = useState('');
  const [location, setLocation] = useState('');
  const [scope, setScope] = useState('Inspección');
  const [serviceLevel, setServiceLevel] = useState('');
  const [frequency, setFrequency] = useState('Anual');
  const [description, setDescription] = useState('');
  const [pn, setPn] = useState('');
  const [serial, setSerial] = useState('');

  // Métodos (incluye UT/PM/tests)
  const allMethods = useMemo<MethodRow[]>(() => ([
    { method: 'visual', result: 'approved', acceptance: 'OP-001', notes: '' },
    { method: 'pm', result: 'na', acceptance: 'ASTM E-709', notes: '' },
    { method: 'ut', result: 'na', acceptance: '', notes: '' },
    { method: 'hydro', result: 'na', acceptance: '', notes: '' },
    { method: 'functional', result: 'na', acceptance: '', notes: '' },
    { method: 'lp', result: 'na', acceptance: '', notes: '' },
    { method: 'gauges', result: 'na', acceptance: '', notes: '' },
  ]), []);
  const [methods, setMethods] = useState<MethodRow[]>(allMethods);

  // UT
  const [utInstrumentId, setUtInstrumentId] = useState('');
  const [utInstrumentExp, setUtInstrumentExp] = useState('');
  const [utStepWedgeId, setUtStepWedgeId] = useState('');
  const [utStepWedgeExp, setUtStepWedgeExp] = useState('');
  const [utPoints, setUtPoints] = useState<UtPoint[]>([
    { point: 'A', min_mm: '', actual_mm: '' },
    { point: 'B', min_mm: '', actual_mm: '' },
    { point: 'C', min_mm: '', actual_mm: '' },
    { point: 'D', min_mm: '', actual_mm: '' },
  ]);
  const [utSketchFile, setUtSketchFile] = useState<File | null>(null);
  const [utSketchUploading, setUtSketchUploading] = useState(false);
  const [utSketchUrl, setUtSketchUrl] = useState<string | null>(null);

  // PM (estado resumido)
  const [pm, setPm] = useState({
    magnetization_method: 'Continuo',
    field_direction: 'Longitudinal',
    particle_type: 'Fluorescente',
    via: '',
    equipo: '',
    corriente: '',
    yoke_id: '', yoke_exp: '',
    lux_uv_id: '', lux_uv_exp: '',
    lux_white_id: '', lux_white_exp: '',
    aerosol: '', aerosol_lot: '', aerosol_exp: '',
    notes: ''
  });

  // Tests genéricos
  const [tests, setTests] = useState<TestRow[]>([
    { test_type: 'hydro', applies: false },
    { test_type: 'functional', applies: false },
    { test_type: 'lp', applies: false }
  ]);

  // Adjuntos / Precinto
  const [sealType, setSealType] = useState('Inoxidable');
  const [sealDue, setSealDue] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  // Firma (imagen)
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  // Firma / estado de guardado
  const [finalResult, setFinalResult] = useState<'approved'|'rejected' | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const initialSnapshotRef = useRef<any | null>(null);
  const snapshotReadyRef = useRef(false);
  const printedRef = useRef(false);
  // Evitar dobles efectos en dev (StrictMode) y consultas redundantes
  const preloadOnceRef = useRef(false);
  const byPartIdOnceRef = useRef<string | null>(null);
  const byPartCodeOnceRef = useRef<string | null>(null);

  // Snapshot del estado
  const snapshotState = () => ({
    header: {
      reportDate, reportNumber, client, location, scope, frequency, description, pn, serial, finalResult,
      workOrderNumber, otShort, sector, serviceLevel,
      workOrderId: wid, partId, partCode
    },
    methods,
    ut: {
      instrument_id: utInstrumentId, instrument_exp: utInstrumentExp,
      step_wedge_id: utStepWedgeId, step_wedge_exp: utStepWedgeExp,
      points: utPoints,
      utSketchUrl,
    },
    pm,
    tests,
    seal: { sealType, sealDue },
    files: { photoUrls },
  });

  // -- Helpers to resolve service/part context without deep joins --
  async function getServiceIdForWorkOrder(supabaseClient: ReturnType<typeof createClient>, wid: string) {
    // 1) Bridge table (preferido)
    const br = await supabaseClient
      .from('work_order_services')
      .select('service_id')
      .eq('work_order_id', wid)
      .order('service_id', { ascending: true })
      .limit(1)
      .maybeSingle();

    const bridgeData = (br as any)?.data as { service_id?: string } | null;
    if (!br.error && bridgeData?.service_id) {
      return bridgeData.service_id as string;
    }

    // 2) Fallback: algunos esquemas guardan work_order_id en services
    const bySvc = await supabaseClient
      .from('services')
      .select('id')
      .eq('work_order_id', wid)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!bySvc.error && (bySvc as any)?.data?.id) {
      return (bySvc as any).data.id as string;
    }

    // 3) Fallback opcional: vista liviana si existe
    try {
      const viaView = await supabaseClient
        .from('work_orders_services_view')
        .select('service_id')
        .eq('work_order_id', wid)
        .limit(1)
        .maybeSingle();
      if (!viaView.error && (viaView as any)?.data?.service_id) {
        return (viaView as any).data.service_id as string;
      }
    } catch { /* vista no existe, ignora */ }

    return null;
  }

  async function getPartRowByServiceId(supabaseClient: ReturnType<typeof createClient>, serviceId: string) {
    // 1) obtener part_id del service
    const svcRes = await supabaseClient
      .from('services')
      .select('id, part_id')
      .eq('id', serviceId)
      .maybeSingle();

    const pid = (!svcRes.error && (svcRes as any)?.data?.part_id)
      ? (svcRes as any).data.part_id as string
      : null;

    if (!pid) return null;

    // 2) leer la pieza desde la vista liviana (solo columnas que EXISTEN)
    const partRes = await supabaseClient
      .from('parts_report_v')
      .select('id, internal_code, numero_parte, numero_serie, client, type')
      .eq('id', pid)
      .maybeSingle();

    return (!partRes.error && (partRes as any)?.data) ? (partRes as any).data as any : null;
  }

  // Precarga por serviceId o por OT (sin joins profundos para evitar 400 Bad Request)
  useEffect(() => {
    if (preloadOnceRef.current) return;        // evita doble disparo en dev
    preloadOnceRef.current = true;

    const load = async () => {
      if (!wid) return;
      setIsHydrating(true);

      try {
        // 1) Si viene serviceId en la URL → resolvemos la pieza desde ese servicio
        if (serviceIdFromURL) {
          const part = await getPartRowByServiceId(supabase, serviceIdFromURL);
          if (part) {
            hydrateFromPartRow(part);
            setPartId(part.id ?? null);
            setReportDate(new Date().toISOString().slice(0, 10));
            setWorkOrderNumber(String(wid).slice(0, 8));
            return; // listo
          }
        }

        // 2) Resolver service_id para esta OT y precargar la pieza asociada
        const sid = await getServiceIdForWorkOrder(supabase, String(wid));
        if (sid) {
          const part = await getPartRowByServiceId(supabase, sid);
          if (part) {
            hydrateFromPartRow(part);
            setPartId(part.id ?? null);
            setReportDate(new Date().toISOString().slice(0, 10));
            setWorkOrderNumber(String(wid).slice(0, 8));
            return; // listo
          }
        }

        // 2.b) Fallback adicional: leer la OT con join anidado directo y tomar la primera pieza
        try {
          const { data: woDeep, error: eDeep } = await supabase
            .from('work_orders')
            .select('id, services ( id, parts ( id, internal_code, client, type, numero_parte, numero_serie ) )')
            .eq('id', wid)
            .maybeSingle();
          if (!eDeep && woDeep) {
            const svc = Array.isArray((woDeep as any).services) ? (woDeep as any).services[0] : (woDeep as any).services;
            const part = svc?.parts;
            if (part) {
              hydrateFromPartRow(part);
              setPartId(part.id ?? null);
              setReportDate(new Date().toISOString().slice(0, 10));
              setWorkOrderNumber(String(wid).slice(0, 8));
              return; // listo
            }
          }
        } catch (e) {
          console.error('Deep join fallback for work_orders failed:', e);
        }
      } catch (err: any) {
        console.error('Preload for report wizard failed:', err?.message || err);
      } finally {
        setIsHydrating(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wid, supabase, serviceIdFromURL, reportIdFromURL]);

  // Precarga informe existente (?reportId=...)
  useEffect(() => {
    const loadExisting = async () => {
      if (!reportIdFromURL) return;
      // Si venimos desde el servidor (Playwright / API PDF), usamos el API interno con Service Role
      if (isServerRender) {
        try {
          const res = await fetch(`/api/reports/${reportIdFromURL}?expand=1`, { headers: { 'Accept': 'application/json' } });
          if (res.ok) {
            const payload = await res.json();
            const rep = payload.report || payload || {};

            // Cabecera
            setReportDate(rep.report_date || '');
            setReportNumber(rep.report_number || '');
            setClient(rep.client || '');
            setLocation(rep.location || '');
            setScope(rep.service_scope || 'Inspección');
            setFrequency(rep.frequency || '');
            setDescription(rep.description || '');
            setPn(rep.pn || '');
            setSerial(rep.serial || '');
            setFinalResult(rep.final_result || '');
            setSector(rep.sector || '');
            setServiceLevel(rep.service_level || '');
            setWorkOrderNumber(String(rep.work_order_id || wid).slice(0, 8));
            // Identificador interno (server payload): soporta múltiples claves
            const ic = (payload as any).internal_code
              ?? (payload as any).part_code
              ?? (rep as any).internal_code
              ?? (rep as any).part_code
              ?? (payload as any).report?.internal_code
              ?? (payload as any).report?.part_code
              ?? null;
            if (ic) setPartCode(String(ic));

            // Métodos
            if (Array.isArray(payload.methods)) {
              setMethods(prev => {
                const map = new Map(prev.map(m => [m.method, { ...m }]));
                for (const m of payload.methods) {
                  const cur = map.get(m.method) || { method: m.method, result: 'na', acceptance: '', notes: '' } as any;
                  map.set(m.method, {
                    ...cur,
                    result: m.result ?? cur.result,
                    acceptance: m.acceptance ?? cur.acceptance,
                    notes: m.notes ?? cur.notes,
                  });
                }
                return Array.from(map.values());
              });
            }

            // UT
            const ut = payload.ut || payload.report_ut || null;
            if (ut) {
              setUtInstrumentId(ut.instrument_id || '');
              setUtInstrumentExp(ut.instrument_exp || '');
              setUtStepWedgeId(ut.step_wedge_id || '');
              setUtStepWedgeExp(ut.step_wedge_exp || '');
              const pts = Array.isArray(ut.points) ? ut.points : (payload.ut_points || []);
              if (Array.isArray(pts) && pts.length) {
                setUtPoints(pts.map((p: any) => ({
                  point: p.point,
                  min_mm: p.min_mm === null || p.min_mm === undefined ? '' : p.min_mm,
                  actual_mm: p.actual_mm === null || p.actual_mm === undefined ? '' : p.actual_mm,
                })));
              }
            }

            // PM
            if (payload.pm) setPm((prev) => ({ ...prev, ...payload.pm }));

            // Tests
            if (Array.isArray(payload.tests)) {
              setTests(prev => {
                const base = [...prev];
                for (const row of payload.tests) {
                  const idx = base.findIndex(b => b.test_type === row.test_type);
                  if (idx >= 0) base[idx] = { ...base[idx], ...row };
                }
                return base;
              });
            }

            // Seal
            if (payload.seal) {
              setSealType(payload.seal.seal_type || payload.seal.type || '');
              setSealDue(payload.seal.due_date || payload.seal.due || '');
            }

            // Files
            const files = payload.files || {};
            const photos = files.photos || payload.photoUrls || [];
            const utSketch = files.ut_sketch || files.utSketchUrl || null;
            const signature = files.signature || files.signatureUrl || null;
            if (Array.isArray(photos) && photos.length) setPhotoUrls(photos);
            if (utSketch) setUtSketchUrl(utSketch);
            if (signature) setSignatureUrl(signature);

            setIsHydrating(false);
            return; // Listo con server data
          }
        } catch (e) {
          console.warn('Server render fetch failed, fallback to anon client:', e);
        }
      }
      setIsHydrating(true);
      try {
        const { data: rep, error: eRep } = await supabase
          .from('reports')
          .select('*')
          .eq('id', reportIdFromURL)
          .maybeSingle();
        if (eRep) throw eRep;
        if (!rep) return;

        setPartId((rep as any).part_id ?? null);
        setReportDate((rep as any).report_date || '');
        setReportNumber((rep as any).report_number || '');
        setClient((rep as any).client || '');
        setLocation((rep as any).location || '');
        setScope((rep as any).service_scope || 'Inspección');
        setFrequency((rep as any).frequency || '');
        setDescription((rep as any).description || '');
        setPn((rep as any).pn || '');
        setSerial((rep as any).serial || '');
        setFinalResult((rep as any).final_result || '');
        setSector((rep as any).sector || '');
        setServiceLevel((rep as any).service_level || '');
        // Identificador interno desde la fila del reporte (si existe)
        const ic2 = (rep as any).internal_code ?? (rep as any).part_code ?? null;
        if (ic2) setPartCode(String(ic2));

        const { data: meth, error: eMeth } = await supabase
          .from('report_methods')
          .select('method, result, acceptance, notes')
          .eq('report_id', reportIdFromURL);
        if (eMeth) throw eMeth;
        if (Array.isArray(meth)) {
          setMethods(prev => {
            const map = new Map(prev.map(m => [m.method, { ...m }]));
            for (const m of (meth as any[])) {
              const cur = map.get(m.method) || { method: m.method, result: 'na', acceptance: '', notes: '' } as MethodRow;
              map.set(m.method, {
                ...cur,
                result: (m as any).result ?? cur.result,
                acceptance: (m as any).acceptance ?? cur.acceptance,
                notes: (m as any).notes ?? cur.notes,
              });
            }
            return Array.from(map.values());
          });
        }

        const { data: ut, error: eUt } = await supabase
          .from('report_ut')
          .select('id, instrument_id, instrument_exp, step_wedge_id, step_wedge_exp')
          .eq('report_id', reportIdFromURL)
          .maybeSingle();
        if (eUt) throw eUt;
        if (ut) {
          setUtInstrumentId((ut as any).instrument_id || '');
          setUtInstrumentExp((ut as any).instrument_exp || '');
          setUtStepWedgeId((ut as any).step_wedge_id || '');
          setUtStepWedgeExp((ut as any).step_wedge_exp || '');
          const { data: pts, error: ePts } = await supabase
            .from('report_ut_points')
            .select('point, min_mm, actual_mm')
            .eq('ut_id', (ut as any).id)
            .order('point', { ascending: true });
          if (ePts) throw ePts;
          if (Array.isArray(pts) && pts.length) {
            setUtPoints(pts.map((p: any) => ({
              point: p.point,
              min_mm: p.min_mm === null ? '' : p.min_mm,
              actual_mm: p.actual_mm === null ? '' : p.actual_mm,
            })));
          }
        }

        const { data: pmRow, error: ePm } = await supabase
          .from('report_pm')
          .select('*')
          .eq('report_id', reportIdFromURL)
          .maybeSingle();
        if (ePm) throw ePm;
        if (pmRow) {
          setPm(prev => ({
            ...prev,
            magnetization_method: (pmRow as any).magnetization_method || prev.magnetization_method,
            field_direction: (pmRow as any).field_direction || prev.field_direction,
            particle_type: (pmRow as any).particle_type || prev.particle_type,
            via: (pmRow as any).via || '',
            equipo: (pmRow as any).equipo || '',
            corriente: (pmRow as any).corriente || '',
            yoke_id: (pmRow as any).yoke_id || '',
            yoke_exp: (pmRow as any).yoke_exp || '',
            lux_uv_id: (pmRow as any).lux_uv_id || '',
            lux_uv_exp: (pmRow as any).lux_uv_exp || '',
            lux_white_id: (pmRow as any).lux_white_id || '',
            lux_white_exp: (pmRow as any).lux_white_exp || '',
            aerosol: (pmRow as any).aerosol || '',
            aerosol_lot: (pmRow as any).aerosol_lot || '',
            aerosol_exp: (pmRow as any).aerosol_exp || '',
            notes: (pmRow as any).notes || '',
          }));
        }

        const { data: testsRows, error: eTests } = await supabase
          .from('report_tests')
          .select('test_type, applies, instrument_id, instrument_exp, params, notes')
          .eq('report_id', reportIdFromURL);
        if (eTests) throw eTests;
        if (Array.isArray(testsRows)) {
          setTests(prev => {
            const base = [...prev];
            for (const row of testsRows as any[]) {
              const idx = base.findIndex(b => b.test_type === row.test_type);
              if (idx >= 0) {
                base[idx] = {
                  test_type: row.test_type,
                  applies: !!row.applies,
                  instrument_id: row.instrument_id || '',
                  instrument_exp: row.instrument_exp || '',
                  params: row.params || null,
                  notes: row.notes || undefined,
                } as any;
              }
            }
            return base;
          });
        }

        const { data: seal, error: eSeal } = await supabase
          .from('report_seals')
          .select('seal_type, due_date')
          .eq('report_id', reportIdFromURL)
          .maybeSingle();
        if (eSeal) throw eSeal;
        if (seal) {
          setSealType((seal as any).seal_type || '');
          setSealDue((seal as any).due_date || '');
        }

        const { data: files, error: eFiles } = await supabase
          .from('report_files')
          .select('section, url')
          .eq('report_id', reportIdFromURL);
        if (eFiles) throw eFiles;
        if (Array.isArray(files)) {
          const photos = files.filter((f: any) => f.section === 'photos').map((f: any) => f.url);
          const utSketch = files.find((f: any) => f.section === 'ut_sketch');
          if (photos.length) setPhotoUrls(photos);
          if (utSketch) setUtSketchUrl((utSketch as any).url);
          const signature = files.find((f: any) => f.section === 'signature');
          if (signature) setSignatureUrl((signature as any).url);
        }
      } catch (err) {
        console.error('Precarga report falló:', err);
      } finally {
        setIsHydrating(false);
      }
    };
    loadExisting();
  }, [reportIdFromURL, supabase, isServerRender, wid]);

  // Autofill when partId changes (e.g., selected in EquipmentForm)
  useEffect(() => {
    if (!partId) return;
    if (byPartIdOnceRef.current === partId) return; // evita duplicado
    byPartIdOnceRef.current = partId;

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('parts_report_v')
          .select('id, internal_code, numero_parte, numero_serie, client, type')
          .eq('id', partId)
          .maybeSingle();
        if (!error && data && !cancelled) {
          hydrateFromPartRow(data as any);
        } else if (error) {
          console.error('[ReportsWizard] parts by id failed:', error.message || error);
        }
      } catch (e) {
        console.error('[ReportsWizard] parts by id exception:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [partId, supabase]);

  // Autofill when partCode changes (typing or picker)
  useEffect(() => {
    const codeRaw = (partCode || '').trim();
    if (!codeRaw) return;
    if (byPartCodeOnceRef.current === codeRaw) return; // evita duplicado
    byPartCodeOnceRef.current = codeRaw;

    let cancelled = false;
    (async () => {
      try {
        // 1) Buscar por IDENTIFICADOR (internal_code) case-insensitive exact match
        const r1 = await supabase
          .from('parts_report_v')
          .select('id, internal_code, numero_parte, numero_serie, client, type')
          .ilike('internal_code', codeRaw)
          .maybeSingle();

        if (!cancelled && !r1.error && r1.data) {
          console.debug('[ReportsWizard] hydrated by internal_code (ilike)', r1.data);
          hydrateFromPartRow(r1.data as any);
          return;
        }

        // Fallback: por PN (numero_parte) case-insensitive
        const r2 = await supabase
          .from('parts_report_v')
          .select('id, internal_code, numero_parte, numero_serie, client, type')
          .ilike('numero_parte', codeRaw)
          .maybeSingle();

        if (!cancelled && !r2.error && r2.data) {
          const row = r2.data as any;
          console.debug('[ReportsWizard] hydrated by PN (ilike)', row);
          // NO tocar partCode cuando vinimos por PN:
          hydrateFromPartRow(row, { allowPartCode: false });
          return;
        }

        if ((r1 as any)?.error || (r2 as any)?.error) {
          console.warn('[ReportsWizard] parts lookup failed:', (r1 as any)?.error || (r2 as any)?.error);
        }
      } catch (e) {
        console.error('[ReportsWizard] parts by code exception:', e);
      }
    })();

    return () => { cancelled = true; };
  }, [partCode, supabase]);

  // Fijar snapshot inicial una vez cargado
  useEffect(() => {
    if (!snapshotReadyRef.current && !isHydrating) {
      const t = setTimeout(() => {
        initialSnapshotRef.current = snapshotState();
        snapshotReadyRef.current = true;
        setIsDirty(false);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [wid, partId, reportIdFromURL, isHydrating]);

  // Dirty
  useEffect(() => {
    if (!snapshotReadyRef.current || isHydrating) return;
    try {
      const cur = JSON.stringify(snapshotState());
      const ini = JSON.stringify(initialSnapshotRef.current);
      setIsDirty(cur !== ini);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportDate, reportNumber, client, location, scope, frequency, description, pn, serial, finalResult, workOrderNumber, sector, serviceLevel, methods, utInstrumentId, utInstrumentExp, utStepWedgeId, utStepWedgeExp, utPoints, utSketchUrl, pm, tests, sealType, sealDue, photoUrls, partCode]);

  // Reinicio de snapshot al cambiar reportId
  useEffect(() => {
    snapshotReadyRef.current = false;
    initialSnapshotRef.current = null;
    setIsDirty(false);
    setIsHydrating(true);
  }, [reportIdFromURL]);

  // Atajo Cmd/Ctrl+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isSave = (e.key.toLowerCase() === 's') && (e.ctrlKey || e.metaKey);
      if (isSave) {
        e.preventDefault();
        if (isDirty) {
          saveAll();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDirty]);

  // Subida de fotos
  const onPhotosChange = (files: FileList | null) => {
    if (!files) return;
    setPhotos(Array.from(files));
  };

  const uploadPhotos = async () => {
    if (photos.length === 0) return;
    setPhotoUploading(true);
    try {
      const successes: string[] = [];
      const errors: string[] = [];
      for (const f of photos) {
        const path = `wo_${wid}/${Date.now()}_${f.name}`;
        const { data, error } = await supabase.storage.from(REPORTS_BUCKET).upload(path, f, { upsert: false });
        if (error || !data?.path) {
          if (error?.message?.toLowerCase().includes('bucket')) {
            errors.push(`${f.name}: bucket "${REPORTS_BUCKET}" no existe. Crea el bucket en Supabase Storage o ajusta NEXT_PUBLIC_SUPABASE_REPORTS_BUCKET.`);
          } else {
            errors.push(`${f.name}: ${error?.message || 'error desconocido al subir'}`);
          }
          continue;
        }
        const { data: publicUrl } = supabase.storage.from(REPORTS_BUCKET).getPublicUrl(data.path);
        if (!publicUrl?.publicUrl) {
          errors.push(`${f.name}: URL pública no disponible`);
          continue;
        }
        successes.push(publicUrl.publicUrl);
      }
      if (successes.length) setPhotoUrls((prev) => [...prev, ...successes]);
      if (errors.length) setError(`Algunas fotos no se subieron:\n${errors.join('\n')}`);
      setPhotos([]);
    } finally {
      setPhotoUploading(false);
    }
  };

  // Subida de croquis UT
  const onUtSketchChange = (fileList: FileList | null) => {
    if (!fileList || !fileList[0]) return;
    setUtSketchFile(fileList[0]);
  };

  const uploadUtSketch = async () => {
    if (!utSketchFile) return;
    setUtSketchUploading(true);
    try {
      const path = `wo_${wid}/ut/${Date.now()}_${utSketchFile.name}`;
      const { data, error } = await supabase.storage.from(REPORTS_BUCKET).upload(path, utSketchFile, { upsert: false });
      if (error) throw error;
      const { data: publicUrl } = supabase.storage.from(REPORTS_BUCKET).getPublicUrl(data.path);
      setUtSketchUrl(publicUrl.publicUrl);
    } finally {
      setUtSketchUploading(false);
    }
  };

  // Subida de firma (imagen)
  const onSignatureChange = (fileList: FileList | null) => {
    if (!fileList || !fileList[0]) return;
    setSignatureFile(fileList[0]);
  };

  const uploadSignature = async () => {
    if (!signatureFile) return;
    setSignatureUploading(true);
    try {
      const path = `wo_${wid}/signature/${Date.now()}_${signatureFile.name}`;
      const { data, error } = await supabase.storage.from(REPORTS_BUCKET).upload(path, signatureFile, { upsert: false });
      if (error) throw error;
      const { data: publicUrl } = supabase.storage.from(REPORTS_BUCKET).getPublicUrl(data.path);
      setSignatureUrl(publicUrl.publicUrl);
    } finally {
      setSignatureUploading(false);
    }
  };

  // Guardado
  const saveAll = async () => {
    if (!wid) { setError('ID de OT inválido'); return; }
    try {
      setSaving(true);
      setError(null);

      const hasAppliedMethod = methods.some(m => m.result !== 'na');
      const hasAppliedTest = tests.some(t => t.applies);
      if (!hasAppliedMethod && !hasAppliedTest) {
        setSaving(false);
        setError('Debes aplicar al menos un método o una prueba para guardar.');
        return;
      }

      // Resolver part_id si fuese necesario
      let pid = partId;
      if (!pid) {
        const { data: woCtx2, error: e2 } = await supabase
          .from('work_orders')
          .select('id, services ( parts ( id ) )')
          .eq('id', wid)
          .single();
        if (e2 || !woCtx2) throw e2 || new Error('No se pudo resolver la pieza de la OT.');
        const service2: any = Array.isArray((woCtx2 as any).services) ? (woCtx2 as any).services[0] : (woCtx2 as any).services;
        pid = service2?.parts?.id || null;
        if (!pid) throw new Error('Esta OT no tiene una pieza asociada (part_id).');
        setPartId(pid);
      }

      // Generar número de informe si falta
      let report_number = reportNumber?.trim() || '';
      if (!report_number) {
        const { data: rn, error: eNum } = await (supabase as any).rpc('next_report_number_for_part', {
          p_work_order_id: wid,
          p_part_id: pid
        });
        if (eNum) throw eNum;
        report_number = rn as string;
      }

      const safeReportDate = (reportDate && reportDate.trim())
        ? reportDate
        : new Date().toISOString().slice(0, 10);

      // Update o Create
      if (reportIdFromURL) {
        const payload = {
          report: {
            work_order_id: wid,
            part_id: pid,
            report_number: reportNumber || null,
            report_date: safeReportDate,
            client: toNull(client),
            location: toNull(location),
            service_scope: toNull(scope),
            frequency: toNull(frequency),
            description: toNull(description),
            sector: toNull(sector),
            service_level: toNull(serviceLevel),
            pn: toNull(pn),
            serial: toNull(serial),
            final_result: finalResult || null,
          },
          methods,
          ut: {
            instrument_id: toNull(utInstrumentId), instrument_exp: toNull(utInstrumentExp),
            step_wedge_id: toNull(utStepWedgeId), step_wedge_exp: toNull(utStepWedgeExp),
            points: utPoints.map(p => ({
              point: p.point,
              min_mm: p.min_mm === '' ? null : Number(p.min_mm),
              actual_mm: p.actual_mm === '' ? null : Number(p.actual_mm)
            }))
          },
          pm,
          tests,
          seal: { seal_type: toNull(sealType), due_date: toNull(sealDue) },
          files: { photos: photoUrls, ut_sketch: utSketchUrl },
        };

        const res = await fetch(`/api/reports/${reportIdFromURL}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const raw = await res.text();
          throw new Error(raw || `PUT /api/reports/${reportIdFromURL} failed (${res.status})`);
        }

        setSaving(false);
        initialSnapshotRef.current = snapshotState();
        setIsDirty(false);
        alert(`Informe actualizado: ${payload.report.report_number || reportIdFromURL}`);
        return;
      }

      // Crear
      const { data: newReport, error: eRep } = await (supabase as any)
        .from('reports')
        .insert({
          work_order_id: wid,
          part_id: pid,
          report_number,
          report_date: safeReportDate,
          client: toNull(client),
          location: toNull(location),
          service_scope: toNull(scope),
          frequency: toNull(frequency),
          description: toNull(description),
          sector: toNull(sector),
          service_level: toNull(serviceLevel),
          pn: toNull(pn),
          serial: toNull(serial),
          final_result: finalResult || null
        })
        .select('id')
        .single();
      if (eRep) throw eRep;

      const reportId = (newReport as any).id as string;
      // Actualiza la URL para incluir reportId y que los botones apunten al PDF real
      router.replace(makeHref({ reportId }), { scroll: false });

      if (methods.length) {
        const rows = methods.map(m => ({
          report_id: reportId,
          method: m.method,
          result: m.result,
          acceptance: toNull(m.acceptance),
          notes: toNull(m.notes)
        }));
        const { error } = await (supabase as any).from('report_methods').insert(rows);
        if (error) throw error;
      }

      const utRow = methods.find(m => m.method==='ut' && m.result!=='na');
      if (utRow) {
        const { data: ut, error: eUt } = await (supabase as any).from('report_ut').insert({
          report_id: reportId,
          instrument_id: toNull(utInstrumentId),
          instrument_exp: toNull(utInstrumentExp),
          step_wedge_id: toNull(utStepWedgeId),
          step_wedge_exp: toNull(utStepWedgeExp)
        }).select('id').single();
        if (eUt) throw eUt;

        const utId = (ut as any).id as string;
        const pts = utPoints
          .filter(p => p.min_mm !== '' || p.actual_mm !== '')
          .map(p => ({
            ut_id: utId,
            point: p.point,
            min_mm: p.min_mm === '' ? null : Number(p.min_mm),
            actual_mm: p.actual_mm === '' ? null : Number(p.actual_mm)
          }));
        if (pts.length) {
          const { error } = await (supabase as any).from('report_ut_points').insert(pts);
          if (error) throw error;
        }
        if (utSketchUrl) {
          const { error: eFile } = await (supabase as any).from('report_files').insert({ report_id: reportId, section: 'ut_sketch', url: utSketchUrl });
          if (eFile) throw eFile;
        }
      }

      const pmRow = methods.find(m => m.method==='pm' && m.result!=='na');
      if (pmRow) {
        const { error } = await (supabase as any).from('report_pm').insert({
          report_id: reportId,
          magnetization_method: toNull(pm.magnetization_method),
          field_direction: toNull(pm.field_direction),
          particle_type: toNull(pm.particle_type),
          via: toNull(pm.via),
          equipo: toNull(pm.equipo),
          corriente: toNull(pm.corriente),
          yoke_id: toNull(pm.yoke_id),
          yoke_exp: toNull(pm.yoke_exp),
          lux_uv_id: toNull(pm.lux_uv_id),
          lux_uv_exp: toNull(pm.lux_uv_exp),
          lux_white_id: toNull(pm.lux_white_id),
          lux_white_exp: toNull(pm.lux_white_exp),
          aerosol: toNull(pm.aerosol),
          aerosol_lot: toNull(pm.aerosol_lot),
          aerosol_exp: toNull(pm.aerosol_exp),
          notes: toNull(pm.notes),
        });
        if (error) throw error;
      }

      const testRows = tests
        .filter(t => t.applies)
        .map(t => ({
          report_id: reportId,
          test_type: t.test_type,
          applies: t.applies,
          instrument_id: toNull(t.instrument_id),
          instrument_exp: toNull(t.instrument_exp),
          params: toNull(t.params),
          notes: toNull(t.notes)
        }));
      if (testRows.length) {
        const { error } = await (supabase as any).from('report_tests').insert(testRows);
        if (error) throw error;
      }

      if (sealType || sealDue) {
        const { error } = await (supabase as any).from('report_seals').insert({ report_id: reportId, seal_type: toNull(sealType), due_date: toNull(sealDue) });
        if (error) throw error;
      }

      if (photoUrls.length) {
        const rows = photoUrls.map(u => ({ report_id: reportId, section: 'photos', url: u }));
        const { error } = await (supabase as any).from('report_files').insert(rows);
        if (error) throw error;
      }
      if (signatureUrl) {
        const { error } = await (supabase as any).from('report_files').insert({ report_id: reportId, section: 'signature', url: signatureUrl });
        if (error) throw error;
      }

      const { data: user } = await (supabase as any).auth.getUser();
      const name = (user as any)?.user?.email ?? 'inspector';
      const { error: eSig } = await (supabase as any).from('report_signatures').insert({ report_id: reportId, role: 'inspector', name, credentials: null });
      if (eSig) throw eSig;

      setSaving(false);
      initialSnapshotRef.current = snapshotState();
      setIsDirty(false);
      alert(`Informe creado: ${report_number}`);
    } catch (e: any) {
      setSaving(false);
      setError(e?.message || 'Error al guardar');
    }
  };

  // Auto-impresión solo en modo PREVIEW (?view=preview&print=1)
  useEffect(() => {
    if (!isPrint || !isPreview || isServerRender || printedRef.current) return;
    printedRef.current = true;

    // Forzamos modo "view" para que el markup sea el de preview
    setMode((prev) => (prev === 'view' ? prev : 'view'));

    // Disparamos window.print() de forma asíncrona y silenciosa
    const t = setTimeout(() => {
      try { window.print(); } catch (err) { /* swallow */ }
    }, 0);

    const handleAfterPrint = () => { try { clearTimeout(t); } catch {} };
    window.addEventListener('afterprint', handleAfterPrint, { once: true } as any);
    return () => { try { clearTimeout(t); } catch {}; try { window.removeEventListener('afterprint', handleAfterPrint as any); } catch {} };
  }, [isPrint, isPreview, isServerRender]);

  // ======================================================
  //                       Adaptadores UTSectionSmart
  // ======================================================
  const utPointsForChild = useMemo(() => toChildPoints(utPoints), [utPoints]);
  const setUtPointsAdapter = (fnOrNext: ((prev: UtPointChild[]) => UtPointChild[]) | UtPointChild[]) => {
    if (typeof fnOrNext === 'function') {
      setUtPoints(prev => fromChildPoints((fnOrNext as (prev: UtPointChild[]) => UtPointChild[])(toChildPoints(prev))));
    } else {
      setUtPoints(fromChildPoints(fnOrNext));
    }
  };

  // ======================================================
  //                       Render
  // ======================================================
  return (
    <div id="page-root" className="space-y-6 print:bg-white">
      {/* Sticky bar cambios sin guardar */}
      {isDirty && (
        <div className="sticky top-0 z-40 w-full border-b bg-base-100/90 backdrop-blur px-3 py-2 flex items-center gap-3 no-print">
          <span className="text-xs text-gray-600">Cambios sin guardar</span>
          <button onClick={() => saveAll()} className="ml-auto inline-flex items-center rounded bg-blue-600 px-3 py-1.5 text-white text-sm hover:bg-blue-700 focus:outline-none">Guardar</button>
          <button onClick={() => { if (confirm('Descartar cambios no guardados?')) { window.location.reload(); } }} className="inline-flex items-center rounded border px-3 py-1.5 text-sm hover:bg-gray-50">Descartar</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <h1 className="text-2xl font-bold">Nuevo informe – WO #{otShort}</h1>
        <Link href="/reports" className="btn">Volver</Link>
      </div>

      {/* Actions */}
      <ActionsBar
        isHydrating={isHydrating}
        isDirty={isDirty}
        saving={saving}
        onReload={() => { if (confirm('Descartar cambios no guardados?')) { window.location.reload(); } }}
        onSave={() => saveAll()}
        printHref={printHref}
        target="_blank"
        rel="noreferrer"
        mode={mode}
        setMode={setMode}
      />

      {/* PREVIEW / PRINT */}
      {(mode === 'view' || isPrint) && (
        <ReportPrintView
          isPrint={isPrint}
          coverOnly={search?.get('coverOnly') === '1'}
          METHOD_LABELS={METHOD_LABELS}
          // Cabecera
          reportDate={reportDate}
          reportNumber={reportNumber}
          workOrderNumber={workOrderNumber}
          otShort={otShort}
          client={client}
          clientName={clientName}
          sector={sector}
          location={location}
          scope={scope}
          serviceLevel={serviceLevel}
          frequency={frequency}
          // Equipo / pieza
          description={description}
          pn={pn}
          serial={serial}
          partCode={partCode || undefined}
          // Métodos y pruebas
          methods={methods}
          utProps={{
            utInstrumentId,
            utInstrumentExp,
            utStepWedgeId,
            utStepWedgeExp,
            utPoints,
            utSketchUrl,
          }}
          pmProps={pm}
          tests={tests}
          // Resultado + adjuntos
          finalResult={finalResult}
          seal={{ type: sealType, due: sealDue }}
          photoUrls={photoUrls}
        />
      )}

      {/* EDITOR */}
      {mode === 'edit' && !isPrint && (
        <div className="space-y-6">
          <StepNav step={step} setStep={setStep} />
          {error && <div className="card text-red-600 no-print">{error}</div>}

          {/* Step 1: Cabecera */}
          {step === 1 && (
            <>
              <HeaderForm
                client={client}
                sector={sector}
                location={location}
                scope={scope}
                serviceLevel={serviceLevel}
                frequency={frequency}
                reportDate={reportDate}
                reportNumber={reportNumber}
                setClient={setClient}
                setSector={setSector}
                setLocation={setLocation}
                setScope={setScope}
                setServiceLevel={setServiceLevel}
                setFrequency={setFrequency}
                setReportDate={setReportDate}
                setReportNumber={setReportNumber}
              />

              <EquipmentForm
                description={description}
                pn={pn}
                serial={serial}
                partCode={partCode ?? ''}
                // Identificador interno (en vez de "Código de pieza")
                setDescription={setDescription}
                setPn={setPn}
                setSerial={setSerial}
                setPartCode={setPartCode}
                onNext={() => setStep(2)}
              />
            </>
          )}

          {/* Step 2: Métodos */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Métodos */}
              <section className="card p-4 bg-base-100 border border-base-200">
                <h2 className="text-lg font-semibold mb-3">Métodos</h2>
                <MethodsTable methods={methods} setMethods={setMethods} />
              </section>

              {/* Pruebas */}
              <section className="card p-4 bg-base-100 border border-base-200">
                <h2 className="text-lg font-semibold mb-3">Pruebas</h2>
                <TestsPanel tests={tests} setTests={setTests} />
              </section>

              {/* Ultrasonido (UT) */}
              <section className="card p-4 bg-base-100 border border-base-200">
                <h2 className="text-lg font-semibold mb-3">Ultrasonido (UT)</h2>
                <UTSectionSmart
                  utInstrumentId={utInstrumentId}
                  utInstrumentExp={utInstrumentExp}
                  utStepWedgeId={utStepWedgeId}
                  utStepWedgeExp={utStepWedgeExp}
                  utPoints={utPointsForChild}
                  setUtPoints={setUtPointsAdapter}
                  utSketchUrl={utSketchUrl}
                  setUtInstrumentId={(id) => setUtInstrumentId(id ?? '')}
                  setUtInstrumentExp={(v) => setUtInstrumentExp(v ?? '')}
                  setUtStepWedgeId={(id) => setUtStepWedgeId(id ?? '')}
                  setUtStepWedgeExp={(v) => setUtStepWedgeExp(v ?? '')}
                />
                <div className="mt-4 no-print flex flex-wrap items-center gap-3">
                  <label className="text-sm text-base-content/80">Croquis UT</label>
                  <input
                    className="file-input file-input-sm"
                    type="file"
                    accept="image/*"
                    onChange={(e) => onUtSketchChange(e.target.files)}
                  />
                  <button
                    className="btn btn-sm"
                    disabled={utSketchUploading || !utSketchFile}
                    onClick={uploadUtSketch}
                  >
                    Subir
                  </button>
                  {utSketchUrl && (
                    <a className="btn btn-sm btn-ghost" href={utSketchUrl} target="_blank" rel="noreferrer noopener">
                      Ver croquis
                    </a>
                  )}
                </div>
              </section>
            </div>
          )}



          {/* Step 3: Archivos / Firma */}
          {step === 3 && (
            <AttachmentsAndSignature
              sealType={sealType}
              sealDue={sealDue}
              setSealType={setSealType}
              setSealDue={setSealDue}
              photos={photos}
              photoUrls={photoUrls}
              photoUploading={photoUploading}
              onPhotosChange={onPhotosChange}
              uploadPhotos={uploadPhotos}
              signatureFile={signatureFile}
              signatureUrl={signatureUrl}
              signatureUploading={signatureUploading}
              onSignatureChange={onSignatureChange}
              uploadSignature={uploadSignature}
              finalResult={finalResult}
              setFinalResult={setFinalResult}
              saving={saving}
              saveAll={saveAll}
              setMode={setMode}
            />
          )}
        </div>
      )}
    </div>
  );
}
