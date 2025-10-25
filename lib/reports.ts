

// lib/reports.ts
import { createClient } from '@supabase/supabase-js';
import type { ReportData } from '@/components/reports/ReportRenderer';

// Util: cliente de Supabase sin sesión persistente (para uso server-side en routes)
function getSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !key) {
    throw new Error('Faltan env: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Devuelve los IDs básicos de informes para una OT (para compilación múltiple).
 */
export async function getReportsByWorkOrder(wid: string) {
  const sb = getSb();
  const { data, error } = await sb
    .from('reports')
    .select('id, report_number, part_id, parts!inner(code)')
    .eq('work_order_id', wid)
    .order('report_date', { ascending: true });
  if (error) throw error;

  // Normaliza resultado
  return (data || []).map((r: any) => ({
    id: r.id as string,
    report_number: r.report_number as string | null,
    part_code: r.parts?.code as string | null,
  }));
}

/**
 * Carga TODO lo necesario para renderizar un informe y lo mapea al tipo ReportData.
 * @param reportId UUID del informe
 */
export async function getReportData(reportId: string): Promise<ReportData> {
  const sb = getSb();

  // 1) Informe base + pieza + OT (usamos alias para traer relations)
  const { data: rep, error: eRep } = await sb
    .from('reports')
    .select(`
      id,
      report_date,
      report_number,
      work_order_id,
      part_id,
      client,
      location,
      service_scope,
      frequency,
      description,
      pn,
      serial,
      final_result,
      parts:part_id (
        id, code, client, type, pn, serial, description
      ),
      work_orders:work_order_id ( id )
    `)
    .eq('id', reportId)
    .maybeSingle();

  if (eRep) throw eRep;
  if (!rep) throw new Error('Informe no encontrado');

  const woNumber = (rep.work_orders?.id || rep.work_order_id || '').toString().slice(0, 8);

  // 2) Métodos
  const { data: methodsRows, error: eMethods } = await sb
    .from('report_methods')
    .select('method, result, acceptance, notes')
    .eq('report_id', reportId);
  if (eMethods) throw eMethods;

  // 3) UT
  const { data: utRow, error: eUt } = await sb
    .from('report_ut')
    .select('id, instrument_id, instrument_exp, step_wedge_id, step_wedge_exp')
    .eq('report_id', reportId)
    .maybeSingle();
  if (eUt) throw eUt;

  let utPoints: ReportData['utPoints'] = [];
  if (utRow?.id) {
    const { data: pts, error: ePts } = await sb
      .from('report_ut_points')
      .select('point, min_mm, actual_mm')
      .eq('ut_id', utRow.id);
    if (ePts) throw ePts;
    utPoints = (pts || []).map((p) => ({
      point: p.point,
      min_mm: p.min_mm ?? '',
      actual_mm: p.actual_mm ?? '',
    }));
  }

  // 4) PM
  const { data: pmRow, error: ePm } = await sb
    .from('report_pm')
    .select(`
      magnetization_method,
      field_direction,
      particle_type,
      yoke_id,
      yoke_exp,
      lux_uv_id,
      lux_uv_exp,
      lux_white_id,
      lux_white_exp,
      aerosol,
      aerosol_lot,
      aerosol_exp,
      notes
    `)
    .eq('report_id', reportId)
    .maybeSingle();
  if (ePm) throw ePm;

  // 5) Tests
  const { data: testsRows, error: eTests } = await sb
    .from('report_tests')
    .select('test_type, applies, instrument_id, instrument_exp, params, notes')
    .eq('report_id', reportId);
  if (eTests) throw eTests;

  // 6) Precinto
  const { data: sealRow, error: eSeal } = await sb
    .from('report_seals')
    .select('seal_type, due_date')
    .eq('report_id', reportId)
    .maybeSingle();
  if (eSeal) throw eSeal;

  // 7) Observaciones / archivos (si quieres fotos, puedes consultarlas aquí)
  const { data: filesRows, error: eFiles } = await sb
    .from('report_files')
    .select('section, url')
    .eq('report_id', reportId);
  if (eFiles) throw eFiles;
  const photos = (filesRows || []).filter((f) => f.section === 'photos').map((f) => f.url);

  // Mapear al tipo que usa el renderer
  const data: ReportData = {
    reportDate: rep.report_date || new Date().toISOString().slice(0, 10),
    reportNumber: rep.report_number || '',
    workOrderNumber: woNumber,
    client: rep.client || rep.parts?.client || '',
    sector: '', // si más adelante agregas columna, mapear aquí
    location: rep.location || '',
    scope: rep.service_scope || '',
    serviceLevel: '', // idem
    frequency: rep.frequency || '',
    description: rep.description || rep.parts?.description || rep.parts?.type || '',
    pn: rep.pn || rep.parts?.pn || '',
    serial: rep.serial || rep.parts?.serial || '',
    partCode: rep.parts?.code || '',

    methods: (methodsRows || []).map((m) => ({
      method: m.method,
      result: m.result,
      acceptance: m.acceptance ?? '',
      notes: m.notes ?? '',
    })),

    utPoints,

    pm: pmRow
      ? {
          magnetization_method: pmRow.magnetization_method ?? '',
          field_direction: pmRow.field_direction ?? '',
          particle_type: pmRow.particle_type ?? '',
          yoke_id: pmRow.yoke_id ?? '',
          yoke_exp: pmRow.yoke_exp ?? '',
          lux_uv_id: pmRow.lux_uv_id ?? '',
          lux_uv_exp: pmRow.lux_uv_exp ?? '',
          lux_white_id: pmRow.lux_white_id ?? '',
          lux_white_exp: pmRow.lux_white_exp ?? '',
          aerosol: pmRow.aerosol ?? '',
          aerosol_lot: pmRow.aerosol_lot ?? '',
          aerosol_exp: pmRow.aerosol_exp ?? '',
          notes: pmRow.notes ?? '',
        }
      : {
          magnetization_method: '',
          field_direction: '',
          particle_type: '',
        },

    tests: (testsRows || []).map((t) => ({
      test_type: t.test_type,
      applies: !!t.applies,
      instrument_id: t.instrument_id ?? '',
      instrument_exp: t.instrument_exp ?? '',
      params: t.params ?? null,
      notes: t.notes ?? '',
    })),

    sealType: sealRow?.seal_type ?? '',
    sealDue: sealRow?.due_date ?? '',
    notes: '', // si guardas observaciones generales en otra tabla/col, mapear aquí
    finalResult: rep.final_result || '',
  };

  // Puedes anexar las fotos a algún campo si luego el renderer las usa
  // (por ahora no están en ReportData; si las agregas, exporta también ese prop)
  // data.photos = photos;

  return data;
}