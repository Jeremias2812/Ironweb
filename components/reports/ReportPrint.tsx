// components/reports/ReportPrint.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import CertificateBox from '@/components/reports/CertificateBox';

type MethodRow = {
  method: string;
  result: 'approved' | 'rejected' | 'na';
  acceptance?: string;
  notes?: string;
};

type UtPoint = { point: string; min_mm?: number | ''; actual_mm?: number | '' };

export type ReportPrintProps = {
  // flags URL
  isPrint?: boolean;
  coverOnly?: boolean;

  // Diccionario de etiquetas
  METHOD_LABELS: Record<string, string>;

  // Cabecera
  reportDate: string;
  reportNumber: string;
  workOrderNumber: string;
  otShort: string;
  client?: string;
  clientName?: string | null;
  sector?: string;
  location?: string;
  scope?: string;
  serviceLevel?: string;
  frequency?: string;

  // Resumen equipo/pieza
  partCode?: string | null;
  description?: string;
  pn?: string;
  serial?: string;

  // Métodos
  methods: MethodRow[];

  // UT
  utProps?: {
    utInstrumentId?: string;
    utInstrumentExp?: string;
    utStepWedgeId?: string;
    utStepWedgeExp?: string;
    utPoints?: UtPoint[];
    utSketchUrl?: string | null;
  };

  // PM
  pmProps?: {
    magnetization_method?: string;
    field_direction?: string;
    particle_type?: string;
    via?: string;
    equipo?: string;
    corriente?: string;
    yoke_id?: string; yoke_exp?: string;
    lux_uv_id?: string; lux_uv_exp?: string;
    lux_white_id?: string; lux_white_exp?: string;
    aerosol?: string; aerosol_lot?: string; aerosol_exp?: string;
    notes?: string;
  };

  // Tests combinados
  tests: Array<{
    test_type: 'hydro' | 'functional' | 'lp';
    applies?: boolean;
    instrument_id?: string;
    instrument_exp?: string;
    params?: any;
    notes?: string;
  }>;

  // Resultado global (solo portada)
  finalResult: 'approved' | 'rejected' | '';

  // Fotos / Precinto (renderizan en página final; los datos llegan desde fuera)
  seal?: { type?: string; due?: string };
  photoUrls?: string[];
};

const DATE_FONT_FIX = `
  :root { --report-font: Arial, Helvetica, sans-serif; }
  #print-root .a4-page { font-family: var(--report-font) !important; line-height: 1.15 !important; }
  #print-root .a4-page, #print-root .a4-page * { box-sizing: border-box !important; }
  #print-root .a4-page > * { break-inside: avoid; }
`;

/** ========= Helpers para detectar páginas vacías ========= **/
function elHasVisibleContent(el: HTMLElement): boolean {
  if (el.querySelector('img, table, .certificate-box, .methods-table, .photos-grid, .cover-page')) return true;
  const raw = el.innerText || el.textContent || '';
  const text = raw.replace(/\u00a0/gi, '').replace(/\s+/g, '');
  return text.length > 0;
}
function pruneEmptyPages(root: HTMLElement | null) {
  if (!root) return;
  const pages = Array.from(root.querySelectorAll<HTMLElement>('.a4-page'));
  pages.forEach((p) => { if (!elHasVisibleContent(p)) p.remove(); });
}
function pruneTrailingEmptyPages(root: HTMLElement | null) {
  if (!root) return;
  const pages = Array.from(root.querySelectorAll<HTMLElement>('.a4-page'));
  let lastWithContent = -1;
  pages.forEach((p, i) => { if (elHasVisibleContent(p)) lastWithContent = i; });
  if (lastWithContent >= 0 && lastWithContent < pages.length - 1) {
    for (let i = pages.length - 1; i > lastWithContent; i--) pages[i].remove();
  }
}

/** ========= Primitiva de página A4 ========= **/
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

/** ========= Cabecera con logo + barra de datos + bloque Cabecera ========= **/
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
      {/* Fila superior */}
      <div className={`${compact ? 'mb-3' : 'mb-4'} certificate-header rounded-sm border border-black/70 overflow-hidden`}>
        <div className="grid grid-cols-12 items-stretch">
          {/* Logo */}
          <div className="col-span-2 flex items-center justify-center border-r border-black/70 bg-white">
            <img src={logoSrc} alt="Logo" className="block" style={{ height: '28mm', width: 'auto' }} />
          </div>
          {/* Título */}
          <div className="col-span-6 flex items-center justify-center">
            <div className="text-center font-semibold tracking-wide text-black text-[14px] leading-tight">
              CERTIFICADO DE INSPECCIÓN
            </div>
          </div>
          {/* Datos */}
          <div className="col-span-4 bg-white">
            <div className="h-full border-l border-black/70">
              <div className="px-3 py-1.5 text-[12px] font-semibold bg-gray-300 text-black border-b border-black/40">Datos</div>
              <div className="p-3 text-[12px] space-y-2">
                <div className="grid grid-cols-3 items-center gap-2">
                  <div className="col-span-1 text-black">Fecha</div>
                  <div className="col-span-2"><div className="border-b border-black/40 leading-4 pb-0.5 text-black">{reportDate || '\u00A0'}</div></div>
                </div>
                <div className="grid grid-cols-3 items-center gap-2">
                  <div className="col-span-1 text-black">Informe Nº</div>
                  <div className="col-span-2"><div className="border-b border-black/40 leading-4 pb-0.5 text-black">{reportNumber || '\u00A0'}</div></div>
                </div>
                <div className="grid grid-cols-3 items-center gap-2">
                  <div className="col-span-1 text-black">OT Nº</div>
                  <div className="col-span-2"><div className="border-b border-black/40 leading-4 pb-0.5 text-black">{workOrderNumber || otShort}</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bloque Cabecera */}
      <div className={`grid grid-cols-12 ${compact ? 'gap-3' : 'gap-4'}`}>
        <div className="col-span-12">
          <CertificateBox title="Cabecera">
            <div className="grid grid-cols-12 gap-3 text-[12px]">
              <div className="col-span-4"><div className="text-black">Cliente</div><div className="border-b border-black/40 leading-4 pb-0.5 text-black">{(client || clientName || '\u00A0') as string}</div></div>
              <div className="col-span-4"><div className="text-black">Sector</div><div className="border-b border-black/40 leading-4 pb-0.5 text-black">{(sector || '\u00A0') as string}</div></div>
              <div className="col-span-4"><div className="text-black">Lugar</div><div className="border-b border-black/40 leading-4 pb-0.5 text-black">{(location || '\u00A0') as string}</div></div>
            </div>
            <div className="grid grid-cols-12 gap-3 mt-2 text-[12px]">
              <div className="col-span-9"><div className="text-black">Alcance del servicio</div><div className="border-b border-black/40 leading-4 pb-0.5 text-black">{(scope || '\u00A0') as string}</div></div>
              <div className="col-span-3"><div className="text-black">Nivel</div><div className="border-b border-black/40 leading-4 pb-0.5 text-black">{(serviceLevel || '\u00A0') as string}</div></div>
            </div>
            <div className="grid grid-cols-12 gap-3 mt-2 text-[12px]">
              <div className="col-span-4"><div className="text-black">Frecuencia</div><div className="border-b border-black/40 leading-4 pb-0.5 text-black">{(frequency || '\u00A0') as string}</div></div>
              <div className="col-span-8" />
            </div>
          </CertificateBox>
        </div>
      </div>
    </>
  );
}

/** ========= Página de método (UT/PM/Tests) ========= **/
function MethodPage({
  method,
  METHOD_LABELS,
  headerProps,
  utProps,
  pmProps,
  testsProps,
  result,
  methodNotes,
}: {
  method: string;
  METHOD_LABELS: Record<string, string>;
  headerProps: any;
  utProps?: ReportPrintProps['utProps'];
  pmProps?: ReportPrintProps['pmProps'];
  testsProps?: { rows: ReportPrintProps['tests'] };
  result?: 'approved' | 'rejected' | 'na';
  methodNotes?: string;
}) {
  return (
    <Page>
      <HeaderBlock {...headerProps} />
      <div className="mt-4">
        <CertificateBox title={`Método: ${METHOD_LABELS[method] || method}`}>
          {/* ======= UT ======= */}
          {method === 'ut' && utProps && (
            <div className="space-y-4 text-[12px]">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="grid grid-cols-3 font-semibold text-[12px] border border-black/40">
                    <div className="px-2 py-1 border-r border-black/40 bg-black/5">Punto</div>
                    <div className="px-2 py-1 border-r border-black/40 bg-black/5 text-center">Actual (mm)</div>
                    <div className="px-2 py-1 bg-black/5 text-center">Mínimo (mm)</div>
                  </div>
                  {(utProps.utPoints || []).map((p, i) => (
                    <div key={`${p.point}-${i}`} className="grid grid-cols-3 border-x border-b border-black/20">
                      <div className="px-2 py-1 border-r border-black/20">{p.point}</div>
                      <div className="px-2 py-1 border-r border-black/20 text-center">{p.actual_mm ?? '—'}</div>
                      <div className="px-2 py-1 text-center">{p.min_mm ?? '—'}</div>
                    </div>
                  ))}
                </div>

                <div className="border border-black/60 rounded-md overflow-hidden text-[12px]">
                  <div className="px-3 py-1.5 font-semibold bg-gray-300 text-black border-b border-black/40">Observaciones</div>
                  <div className="p-3 min-h-[72px]">{methodNotes && methodNotes.trim().length ? methodNotes : '—'}</div>
                  <div className="px-3 pb-2">
                    {result === 'approved' && <span className="inline-block px-2 py-1 rounded bg-green-600 text-white text-[11px] uppercase">Aprobado</span>}
                    {result === 'rejected' && <span className="inline-block px-2 py-1 rounded bg-red-600 text-white text-[11px] uppercase">Rechazado</span>}
                    {!result || result === 'na' ? <span className="inline-block px-2 py-1 rounded bg-gray-300 text-[11px] uppercase">N/A</span> : null}
                  </div>
                </div>
              </div>

              <div>
                <div className="grid grid-cols-3 font-semibold text-[12px] border border-black/40">
                  <div className="px-2 py-1 border-r border-black/40 bg-black/5">Instrumento</div>
                  <div className="px-2 py-1 border-r border-black/40 bg-black/5 text-center">ID</div>
                  <div className="px-2 py-1 bg-black/5 text-center">Expiración</div>
                </div>
                <div className="grid grid-cols-3 border-x border-b border-black/20">
                  <div className="px-2 py-1 border-r border-black/20">Patrón escalonado</div>
                  <div className="px-2 py-1 border-r border-black/20 text-center">{utProps.utStepWedgeId || '—'}</div>
                  <div className="px-2 py-1 text-center">{utProps.utStepWedgeExp || '—'}</div>
                </div>
                <div className="grid grid-cols-3 border-x border-b border-black/20">
                  <div className="px-2 py-1 border-r border-black/20">Equipo de Ultrasonido</div>
                  <div className="px-2 py-1 border-r border-black/20 text-center">{utProps.utInstrumentId || '—'}</div>
                  <div className="px-2 py-1 text-center">{utProps.utInstrumentExp || '—'}</div>
                </div>
              </div>

              {utProps.utSketchUrl && (
                <div>
                  <div className="text-[12px] font-semibold mb-1">Croquis / Imagen</div>
                  <img src={utProps.utSketchUrl} alt="Croquis UT" className="max-w-full" />
                </div>
              )}
            </div>
          )}

          {/* ======= PM ======= */}
          {method === 'pm' && pmProps && (
            <div className="space-y-4 text-[12px]">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="grid grid-cols-2 font-semibold text-[12px] border border-black/40">
                    <div className="px-2 py-1 border-r border-black/40 bg-black/5">Parámetro</div>
                    <div className="px-2 py-1 bg-black/5">Valor</div>
                  </div>
                  {(
                    [
                      ['Método de magnetización', pmProps.magnetization_method],
                      ['Campo', pmProps.field_direction],
                      ['Partículas tipo', pmProps.particle_type],
                      ['Vía', pmProps.via],
                      ['Equipo', pmProps.equipo],
                      ['Corriente', pmProps.corriente],
                    ] as Array<[string, string | undefined]>
                  ).map(([k, v], i) => (
                    <div key={i} className="grid grid-cols-2 border-x border-b border-black/20">
                      <div className="px-2 py-1 border-r border-black/20">{k}</div>
                      <div className="px-2 py-1">{v || '—'}</div>
                    </div>
                  ))}
                </div>

                <div className="border border-black/60 rounded-md overflow-hidden text-[12px]">
                  <div className="px-3 py-1.5 font-semibold bg-gray-300 text-black border-b border-black/40">Observaciones</div>
                  <div className="p-3 min-h-[72px]">{(pmProps.notes || methodNotes || '').trim() || '—'}</div>
                  <div className="px-3 pb-2">
                    {result === 'approved' && <span className="inline-block px-2 py-1 rounded bg-green-600 text-white text-[11px] uppercase">Aprobado</span>}
                    {result === 'rejected' && <span className="inline-block px-2 py-1 rounded bg-red-600 text-white text-[11px] uppercase">Rechazado</span>}
                    {!result || result === 'na' ? <span className="inline-block px-2 py-1 rounded bg-gray-300 text-[11px] uppercase">N/A</span> : null}
                  </div>
                </div>
              </div>

              <div>
                <div className="grid grid-cols-3 font-semibold text-[12px] border border-black/40">
                  <div className="px-2 py-1 border-r border-black/40 bg-black/5">Instrumento</div>
                  <div className="px-2 py-1 border-r border-black/40 bg-black/5 text-center">ID / Lote</div>
                  <div className="px-2 py-1 bg-black/5 text-center">Expiración</div>
                </div>
                <div className="grid grid-cols-3 border-x border-b border-black/20">
                  <div className="px-2 py-1 border-r border-black/20">Yugo electromecánico</div>
                  <div className="px-2 py-1 border-r border-black/20 text-center">{pmProps.yoke_id || '—'}</div>
                  <div className="px-2 py-1 text-center">{pmProps.yoke_exp || '—'}</div>
                </div>
                <div className="grid grid-cols-3 border-x border-b border-black/20">
                  <div className="px-2 py-1 border-r border-black/20">Aerosol</div>
                  <div className="px-2 py-1 border-r border-black/20 text-center">{[pmProps.aerosol, pmProps.aerosol_lot && `Lote ${pmProps.aerosol_lot}`].filter(Boolean).join(' · ') || '—'}</div>
                  <div className="px-2 py-1 text-center">{pmProps.aerosol_exp || '—'}</div>
                </div>
                <div className="grid grid-cols-3 border-x border-b border-black/20">
                  <div className="px-2 py-1 border-r border-black/20">Luxómetro luz blanca</div>
                  <div className="px-2 py-1 border-r border-black/20 text-center">{pmProps.lux_white_id || '—'}</div>
                  <div className="px-2 py-1 text-center">{pmProps.lux_white_exp || '—'}</div>
                </div>
                <div className="grid grid-cols-3 border-x border-b border-black/20">
                  <div className="px-2 py-1 border-r border-black/20">Luxómetro luz UV</div>
                  <div className="px-2 py-1 border-r border-black/20 text-center">{pmProps.lux_uv_id || '—'}</div>
                  <div className="px-2 py-1 text-center">{pmProps.lux_uv_exp || '—'}</div>
                </div>
              </div>
            </div>
          )}

          {/* ======= Tests (Hydro/Functional/LP) – este MethodPage lo usamos solo para UT/PM.
              Las pruebas combinadas van en un Page propio más abajo. ======= */}
        </CertificateBox>
      </div>
    </Page>
  );
}

/** ========= Vista de impresión/preview completa ========= **/
export default function ReportPrintView(props: ReportPrintProps) {
  const {
    isPrint, coverOnly,
    METHOD_LABELS,
    reportDate, reportNumber, workOrderNumber, otShort,
    client, clientName, sector, location, scope, serviceLevel, frequency,
    partCode, description, pn, serial,
    methods, utProps, pmProps, tests, finalResult,
    seal, photoUrls,
  } = props;

  const rootRef = useRef<HTMLDivElement | null>(null);

  // Sincronizar limpieza de páginas vacías y timing de window.print()
  useEffect(() => {
    if (!isPrint) return;
    let printed = false;
    const root = rootRef.current;

    const runPrune = () => { pruneEmptyPages(root); pruneTrailingEmptyPages(root); };

    const tryPrint = () => {
      if (printed) return;
      printed = true;
      runPrune();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try { (window as any).print?.(); } catch {}
        });
      });
    };

    // primer intento
    requestAnimationFrame(() => setTimeout(tryPrint, 0));

    // fuentes listas
    (document as any).fonts?.ready?.then(() => { if (!printed) setTimeout(tryPrint, 0); }).catch(() => {});

    const before = () => runPrune();
    const after = () => { printed = true; };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, [isPrint]);

  return (
    <div id="print-root" ref={rootRef} className="space-y-6 preview-container">
      {/* Estilos globales para que la preview coincida con PDF */}
      <style jsx global>{DATE_FONT_FIX}</style>
      <style jsx global>{`
        /* Quitar sombras en preview */
        #print-root, #print-root * { box-shadow: none !important; }
        #print-root [class*="shadow"], #print-root [class*="shadow-"], #print-root .card { box-shadow: none !important; }
        #print-root .card { background: transparent !important; }
        .a4-page:first-of-type { padding-top: 0 !important; }
        /* Fix borde derecho del recuadro del logo en algunos zoom levels */
        .certificate-header .grid > *:first-child { position: relative !important; }
        .certificate-header .grid > *:first-child::after {
          content: "" !important; position: absolute !important; top: 0 !important; right: -0.5px !important;
          width: 1px !important; height: 100% !important; background: rgba(0,0,0,0.6) !important; pointer-events: none !important;
        }
      `}</style>

      {/* ======= 1) Portada ======= */}
      <Page>
        <div className="cover-page">
          <HeaderBlock
            compact
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
          />

          {/* Equipo / Pieza */}
          <div className="mt-3">
            <CertificateBox title="Equipo / Pieza">
              <div className="grid grid-cols-12 gap-3 text-[12px]">
                <div className="col-span-12 md:col-span-6">
                  <div className="text-black">Identificador interno</div>
                  <div className="border-b border-black/40 leading-4 pb-0.5 text-black">{(partCode ?? '\u00A0') as string}</div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="text-black">P/N</div>
                  <div className="border-b border-black/40 leading-4 pb-0.5 text-black">{(pn || '\u00A0') as string}</div>
                </div>
                <div className="col-span-12 md:col-span-8">
                  <div className="text-black">Descripción</div>
                  <div className="border-b border-black/40 leading-4 pb-0.5 text-black">{(description || '\u00A0') as string}</div>
                </div>
                <div className="col-span-12 md:col-span-4">
                  <div className="text-black">Serie</div>
                  <div className="border-b border-black/40 leading-4 pb-0.5 text-black">{(serial || '\u00A0') as string}</div>
                </div>
              </div>
            </CertificateBox>
          </div>

          {/* Métodos (resumen) y Parámetros en dos columnas */}
          <div className="mt-3 grid md:grid-cols-2 gap-3 cover-two-cols">
            <div>
              <CertificateBox title="Métodos y resultados">
                <div className="text-[12px] leading-[1.15]">
                  {/* Encabezado estilo UT */}
                  <div className="grid" style={{ gridTemplateColumns: '1.2fr 0.9fr 1fr' }}>
                    <div className="px-2 py-1 border border-black/40 bg-black/5 font-semibold">Método</div>
                    <div className="px-2 py-1 border-t border-b border-black/40 bg-black/5 font-semibold text-center">Resultado</div>
                    <div className="px-2 py-1 border border-black/40 bg-black/5 font-semibold text-right">Norma / Procedimiento</div>
                  </div>
                  {/* Filas */}
                  {methods.map((m, i) => (
                    <div key={m.method + i} className="grid" style={{ gridTemplateColumns: '1.2fr 0.9fr 1fr' }}>
                      <div className="px-2 py-1 border-l border-r border-b border-black/20">{props.METHOD_LABELS[m.method] || m.method}</div>
                      <div className="px-2 py-1 border-r border-b border-black/20 text-center uppercase tracking-[0.02em] font-semibold">
                        {m.result === 'na' ? 'N/A' : m.result === 'approved' ? 'APROBADO' : 'RECHAZADO'}
                      </div>
                      <div className="px-2 py-1 border-r border-b border-black/20 text-right">{m.acceptance || ''}</div>
                    </div>
                  ))}
                </div>
              </CertificateBox>
            </div>

            <div>
              <CertificateBox title="Parámetros UT / PM / Pruebas">
                <div className="text-[11px] leading-[1.15] space-y-0.5">
                  {methods.some((m) => m.method === 'ut' && m.result !== 'na') && (
                    <>
                      <div className="font-semibold">UT</div>
                      <div>Equipo: {utProps?.utInstrumentId || '—'} · Vence: {utProps?.utInstrumentExp || '—'}</div>
                      <div>Patrón: {utProps?.utStepWedgeId || '—'} · Vence: {utProps?.utStepWedgeExp || '—'}</div>
                    </>
                  )}
                  {methods.some((m) => m.method === 'pm' && m.result !== 'na') && (
                    <>
                      <div className="font-semibold mt-1">PM</div>
                      <div>
                        Método: {pmProps?.magnetization_method || '—'} · Campo: {pmProps?.field_direction || '—'} · Partículas: {pmProps?.particle_type || '—'}
                      </div>
                    </>
                  )}
                  {tests.filter((t) => t.applies).map((t, i) => (
                    <div key={i}>
                      {({ hydro: 'Hidrostática', functional: 'Funcional', lp: 'Líquidos penetrantes' } as any)[t.test_type]}
                      {' '}— Instr.: {t.instrument_id || '—'} · Vence: {t.instrument_exp || '—'}
                    </div>
                  ))}
                </div>
              </CertificateBox>
            </div>
          </div>

          {/* Resultado final + Firma */}
          <div className="mt-3 grid md:grid-cols-2 gap-3">
            <CertificateBox title="Resultado final">
              <div className="text-[12px] uppercase">
                {finalResult ? (finalResult === 'approved' ? 'APROBADO' : 'RECHAZADO') : '—'}
              </div>
            </CertificateBox>
            <CertificateBox title="Firma inspector">
              <div className="h-10 border-b border-black/50" />
              <div className="text-[11px] mt-1">Nombre / Firma / Fecha</div>
            </CertificateBox>
          </div>
        </div>
      </Page>

      {/* ======= 2) Hojas por método UT/PM ======= */}
      {!coverOnly && methods
        .filter((m) => m.result !== 'na' && (m.method === 'ut' || m.method === 'pm'))
        .map((m) => (
          <MethodPage
            key={m.method}
            method={m.method}
            METHOD_LABELS={props.METHOD_LABELS}
            headerProps={{
              reportDate, reportNumber, workOrderNumber, otShort, client, clientName, sector, location, scope, serviceLevel, frequency,
            }}
            utProps={utProps}
            pmProps={pmProps}
            testsProps={{ rows: tests.filter((t) => t.applies) }}
            result={m.result}
            methodNotes={m.notes}
          />
        ))}

      {/* ======= 2b) Página de pruebas combinadas ======= */}
      {!coverOnly && tests.some(t => t.applies && (t.test_type === 'hydro' || t.test_type === 'functional' || t.test_type === 'lp')) && (
        <Page>
          <HeaderBlock
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
          />
          {(['hydro','functional','lp'] as const).map((tkey) => {
            const trow = tests.find(t => t.applies && t.test_type === tkey);
            if (!trow) return null;
            const mrow = methods.find(m => m.method === tkey);
            const result = (mrow?.result as 'approved'|'rejected'|'na'|undefined) || 'na';
            const title = tkey === 'hydro' ? 'Prueba hidrostática' : tkey === 'functional' ? 'Prueba funcional' : 'Líquidos penetrantes';
            return (
              <div key={tkey} className="mt-4">
                <CertificateBox title={`Método: ${title}`}>
                  <div className="space-y-4 text-[12px]">
                    {tkey === 'hydro' ? (
                      <div className="space-y-2">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <div className="grid grid-cols-3 font-semibold text-[12px] border border-black/40">
                              <div className="px-2 py-1 border-r border-black/40 bg-black/5">Instrumento</div>
                              <div className="px-2 py-1 border-r border-black/40 bg-black/5 text-center">ID</div>
                              <div className="px-2 py-1 bg-black/5 text-center">Expiración</div>
                            </div>
                            <div className="grid grid-cols-3 border-x border-b border-black/20">
                              <div className="px-2 py-1 border-r border-black/20">{trow.params?.instrument || '—'}</div>
                              <div className="px-2 py-1 border-r border-black/20 text-center">{trow.instrument_id || '—'}</div>
                              <div className="px-2 py-1 text-center">{trow.instrument_exp || '—'}</div>
                            </div>
                          </div>
                          <div className="border border-black/60 rounded-md overflow-hidden text-[12px]">
                            <div className="px-3 py-1.5 font-semibold bg-gray-300 text-black border-b border-black/40">Observaciones</div>
                            <div className="p-3 min-h-[90px]">{trow.notes || '—'}</div>
                            <div className="px-3 pb-2">
                              {result === 'approved' && <span className="inline-block px-2 py-1 rounded bg-green-600 text-white text-[11px] uppercase">Aprobado</span>}
                              {result === 'rejected' && <span className="inline-block px-2 py-1 rounded bg-red-600 text-white text-[11px] uppercase">Rechazado</span>}
                              {!result || result === 'na' ? <span className="inline-block px-2 py-1 rounded bg-gray-300 text-[11px] uppercase">N/A</span> : null}
                            </div>
                          </div>
                        </div>
                        <div className="text-[12px] mt-2">
                          <span className="mr-2">Realizó:</span>
                          <span className="inline-block w-[220px] border-b border-black/60 align-middle" />
                        </div>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="grid grid-cols-2 font-semibold text-[12px] border border-black/40">
                            <div className="px-2 py-1 border-r border-black/40 bg-black/5">Campo</div>
                            <div className="px-2 py-1 bg-black/5">Valor</div>
                          </div>
                          <div className="grid grid-cols-2 border-x border-b border-black/20">
                            <div className="px-2 py-1 border-r border-black/20">Instrumento</div>
                            <div className="px-2 py-1">{trow.instrument_id || '—'}</div>
                          </div>
                          <div className="grid grid-cols-2 border-x border-b border-black/20">
                            <div className="px-2 py-1 border-r border-black/20">Expiración</div>
                            <div className="px-2 py-1">{trow.instrument_exp || '—'}</div>
                          </div>
                          <div className="grid grid-cols-2 border-x border-b border-black/20">
                            <div className="px-2 py-1 border-r border-black/20">Parámetros / Resultado</div>
                            <div className="px-2 py-1">{trow.params?.text || '—'}</div>
                          </div>
                        </div>
                        <div className="border border-black/60 rounded-md overflow-hidden text-[12px]">
                          <div className="px-3 py-1.5 font-semibold bg-gray-300 text-black border-b border-black/40">Observaciones</div>
                          <div className="p-3 min-h-[72px]">{trow.notes || '—'}</div>
                          <div className="px-3 pb-2">
                            {result === 'approved' && <span className="inline-block px-2 py-1 rounded bg-green-600 text-white text-[11px] uppercase">Aprobado</span>}
                            {result === 'rejected' && <span className="inline-block px-2 py-1 rounded bg-red-600 text-[11px] uppercase">Rechazado</span>}
                            {!result || result === 'na' ? <span className="inline-block px-2 py-1 rounded bg-gray-300 text-[11px] uppercase">N/A</span> : null}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CertificateBox>
              </div>
            );
          })}
        </Page>
      )}

      {/* ======= 3) Página final: Precinto + Fotos ======= */}
      {!coverOnly && (
        <Page>
          <HeaderBlock
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
          />
          {/* Precinto */}
          {seal && (seal.type || seal.due) && (
            <div className="mt-4">
              <CertificateBox title="Precinto">
                <div className="grid grid-cols-2 gap-4 text-[12px]">
                  <div><div className="text-black">Tipo</div><div className="border-b border-black/40 leading-4 pb-0.5 text-black">{seal.type || '—'}</div></div>
                  <div><div className="text-black">Vencimiento</div><div className="border-b border-black/40 leading-4 pb-0.5 text-black">{seal.due || '—'}</div></div>
                </div>
              </CertificateBox>
            </div>
          )}
          {/* Fotografías */}
          {Array.isArray(photoUrls) && photoUrls.length > 0 && (
            <div className="mt-4">
              <CertificateBox title="Fotografías">
                <div className="grid grid-cols-3 gap-2 photos-grid">
                  {photoUrls.slice(0, 6).map((u, i) => (
                    <div key={i} className="border border-black/20 p-1 flex items-center justify-center">
                      <img src={u} alt={`Foto ${i+1}`} style={{ maxWidth: '100%', maxHeight: '60mm', objectFit: 'contain' }} />
                    </div>
                  ))}
                </div>
              </CertificateBox>
            </div>
          )}
        </Page>
      )}
    </div>
  );
}