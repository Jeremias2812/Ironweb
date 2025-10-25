/* app/api/reports/[id]/route.ts */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const nz = (v: any) => (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) ? null : v;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;
  if (!url || !key) {
    throw new Error('Missing Supabase env URL or KEY');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  try {
    const reportId = ctx.params?.id;
    if (!reportId) {
      return NextResponse.json({ ok: false, error: 'Missing report id' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1) Buscar UT relacionados
    const { data: utRows, error: utSelErr } = await supabase
      .from('report_ut')
      .select('id')
      .eq('report_id', reportId);
    if (utSelErr) throw utSelErr;

    const utIds = (utRows ?? []).map((r: any) => r.id);

    // 2) Borrar puntos UT primero
    if (utIds.length) {
      const { error } = await supabase.from('report_ut_points').delete().in('ut_id', utIds);
      if (error) throw error;
    }

    // 3) Borrar tablas hijas directas
    const children = [
      'report_files',
      'report_methods',
      'report_pm',
      'report_tests',
      'report_seals',
      'report_signatures',
    ] as const;
    for (const table of children) {
      const { error } = await supabase.from(table).delete().eq('report_id', reportId);
      if (error) throw error;
    }

    // 4) Borrar UT
    if (utIds.length) {
      const { error } = await supabase.from('report_ut').delete().in('id', utIds);
      if (error) throw error;
    }

    // 5) Finalmente, borrar el informe
    const { error: repErr } = await supabase.from('reports').delete().eq('id', reportId);
    if (repErr) throw repErr;

    // 6) Verificación: asegurar que ya no existe
    const { data: stillThere, error: checkErr } = await supabase
      .from('reports')
      .select('id')
      .eq('id', reportId)
      .maybeSingle();
    if (checkErr) throw checkErr;
    if (stillThere) {
      return NextResponse.json({ ok: false, error: 'Delete did not persist' }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('DELETE /api/reports/[id] failed:', err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const reportId = params.id;
    if (!reportId) {
      return NextResponse.json({ ok: false, error: 'Missing report id' }, { status: 400 });
    }

    const body = await req.json();
    console.log('PUT /api/reports', { id: reportId, hasReport: !!body.report, hasMethods: Array.isArray(body.methods), hasPm: !!body.pm, hasUt: !!body.ut, hasFiles: !!body.files });
    const hasVal = (v: any) => !(v === undefined || v === null || (typeof v === 'string' && v.trim() === ''));

    const admin = getAdminClient();

    // 1) Update core report fields
    const core = body.report || {};
    const { error: eUp } = await admin
      .from('reports')
      .update({
        work_order_id: nz(core.work_order_id),
        part_id: nz(core.part_id),
        report_number: nz(core.report_number),
        report_date: nz(core.report_date),
        client: nz(core.client),
        location: nz(core.location),
        service_scope: nz(core.service_scope),
        frequency: nz(core.frequency),
        description: nz(core.description),
        sector: nz(core.sector),
        service_level: nz(core.service_level),
        pn: nz(core.pn),
        serial: nz(core.serial),
        final_result: nz(core.final_result),
      })
      .eq('id', reportId);
    if (eUp) throw eUp;

    // 2) Delete children in safe order
    const { data: utRows, error: eSelUt } = await admin
      .from('report_ut')
      .select('id')
      .eq('report_id', reportId);
    if (eSelUt) throw eSelUt;
    const methods = Array.isArray(body.methods) ? body.methods : [];
    console.log('PUT /api/reports methods summary', methods.map((m: any) => ({ method: m.method, result: m.result })));
    const utIds = (utRows || []).map((r: any) => r.id);
    if (utIds.length) {
      const { error: ePtsDel } = await admin
        .from('report_ut_points')
        .delete()
        .in('ut_id', utIds);
      if (ePtsDel) throw ePtsDel;
    }
    const { error: eUtDel } = await admin
      .from('report_ut')
      .delete()
      .eq('report_id', reportId);
    if (eUtDel) throw eUtDel;

    const { error: eMethDel } = await admin
      .from('report_methods')
      .delete()
      .eq('report_id', reportId);
    if (eMethDel) throw eMethDel;

    const { error: ePmDel } = await admin
      .from('report_pm')
      .delete()
      .eq('report_id', reportId);
    if (ePmDel) throw ePmDel;

    const { error: eTestsDel } = await admin
      .from('report_tests')
      .delete()
      .eq('report_id', reportId);
    if (eTestsDel) throw eTestsDel;

    const { error: eSealsDel } = await admin
      .from('report_seals')
      .delete()
      .eq('report_id', reportId);
    if (eSealsDel) throw eSealsDel;

    const { error: eFilesDel } = await admin
      .from('report_files')
      .delete()
      .eq('report_id', reportId);
    if (eFilesDel) throw eFilesDel;

    // 3) Reinsert children from payload
    const methodsInsert = methods;
    if (methodsInsert.length) {
      const rows = methodsInsert.map((m: any) => ({
        report_id: reportId,
        method: m.method,
        result: m.result,
        acceptance: m.acceptance ?? null,
        notes: m.notes ?? null,
      }));
      const { error } = await admin.from('report_methods').insert(rows);
      if (error) throw error;
    }

    const ut = body.ut || null;
    if (ut && methods.some((m: any) => m.method === 'ut' && m.result !== 'na')) {
      const { data: utIns, error: eUtIns } = await admin
        .from('report_ut')
        .insert({
          report_id: reportId,
          instrument_id: nz(ut.instrument_id),
          instrument_exp: nz(ut.instrument_exp),
          step_wedge_id: nz(ut.step_wedge_id),
          step_wedge_exp: nz(ut.step_wedge_exp),
        })
        .select('id')
        .single();
      if (eUtIns) throw eUtIns;
      const utId = utIns.id as string;
      const pts = Array.isArray(ut.points) ? ut.points.filter((p: any) => p.min_mm !== null || p.actual_mm !== null) : [];
      if (pts.length) {
        const rows = pts.map((p: any) => ({ ut_id: utId, point: p.point, min_mm: p.min_mm, actual_mm: p.actual_mm }));
        const { error } = await admin.from('report_ut_points').insert(rows);
        if (error) throw error;
      }
    }

    // === Ensure automatic UT sketch ===
    if (methods.some((m: any) => m.method === 'ut' && m.result !== 'na')) {
      // 1) Get part type slug from parts table
      const { data: partRow, error: ePart } = await admin
        .from('parts')
        .select('type')
        .eq('id', core.part_id)
        .maybeSingle();
      if (ePart) throw ePart;

      if (partRow?.type) {
        // 2) Find sketch path in part_types
        const { data: typeRow, error: eType } = await admin
          .from('part_types')
          .select('sketch_ut_path')
          .eq('slug', partRow.type)
          .maybeSingle();
        if (eType) throw eType;

        if (typeRow?.sketch_ut_path) {
          // 3) Get public URL from storage bucket "assets"
          const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
          const bucket = 'assets';
          const path = typeRow.sketch_ut_path;
          const publicUrl = `${supaUrl}/storage/v1/object/public/${bucket}/${path}`;

          // 4) Delete any existing ut_sketch file for this report
          const { error: eDelSketch } = await admin
            .from('report_files')
            .delete()
            .eq('report_id', reportId)
            .eq('section', 'ut_sketch');
          if (eDelSketch) throw eDelSketch;

          // 5) Insert the automatic UT sketch
          const { error: eInsSketch } = await admin.from('report_files').insert({
            report_id: reportId,
            section: 'ut_sketch',
            url: publicUrl,
          });
          if (eInsSketch) throw eInsSketch;
        }
      }
    }

    const pm = body.pm || null;
    const pmHasAny = !!(pm && (
      hasVal(pm.magnetization_method) || hasVal(pm.field_direction) || hasVal(pm.particle_type) ||
      hasVal(pm.via) || hasVal(pm.equipo) || hasVal(pm.corriente) ||
      hasVal(pm.yoke_id) || hasVal(pm.yoke_exp) ||
      hasVal(pm.lux_uv_id) || hasVal(pm.lux_uv_exp) ||
      hasVal(pm.lux_white_id) || hasVal(pm.lux_white_exp) ||
      hasVal(pm.aerosol) || hasVal(pm.aerosol_lot) || hasVal(pm.aerosol_exp) ||
      hasVal(pm.notes)
    ));
    // Reinsert PM if any PM field is present OR methods marks PM applied (avoid data loss when UI leaves PM as 'na').
    if (pm && (pmHasAny || methods.some((m: any) => m.method === 'pm' && m.result !== 'na'))) {
      console.log('PUT /api/reports reinserting PM', { via: pm.via, equipo: pm.equipo, corriente: pm.corriente });
      const { error } = await admin.from('report_pm').insert({
        report_id: reportId,
        magnetization_method: nz(pm.magnetization_method),
        field_direction: nz(pm.field_direction),
        particle_type: nz(pm.particle_type),
        via: nz(pm.via),
        equipo: nz(pm.equipo),
        corriente: nz(pm.corriente),
        yoke_id: nz(pm.yoke_id),
        yoke_exp: nz(pm.yoke_exp),
        lux_uv_id: nz(pm.lux_uv_id),
        lux_uv_exp: nz(pm.lux_uv_exp),
        lux_white_id: nz(pm.lux_white_id),
        lux_white_exp: nz(pm.lux_white_exp),
        aerosol: nz(pm.aerosol),
        aerosol_lot: nz(pm.aerosol_lot),
        aerosol_exp: nz(pm.aerosol_exp),
        notes: nz(pm.notes),
      });
      if (error) throw error;
    }

    const tests = Array.isArray(body.tests) ? body.tests.filter((t: any) => t.applies) : [];
    if (tests.length) {
      const rows = tests.map((t: any) => ({
        report_id: reportId,
        test_type: t.test_type,
        applies: !!t.applies,
        instrument_id: nz(t.instrument_id),
        instrument_exp: nz(t.instrument_exp),
        params: nz(t.params),
        notes: nz(t.notes),
      }));
      const { error } = await admin.from('report_tests').insert(rows);
      if (error) throw error;
    }

    const seal = body.seal || null;
    if (seal && (seal.seal_type || seal.due_date)) {
      const { error } = await admin.from('report_seals').insert({
        report_id: reportId,
        seal_type: nz(seal.seal_type),
        due_date: nz(seal.due_date),
      });
      if (error) throw error;
    }

    const files = body.files || {};
    const photoUrls = Array.isArray(files.photos) ? files.photos : [];
    const utSketch = files.ut_sketch || null;
    const fileRows: any[] = [];
    for (const u of photoUrls) fileRows.push({ report_id: reportId, section: 'photos', url: u });
    if (utSketch) fileRows.push({ report_id: reportId, section: 'ut_sketch', url: utSketch });
    const cleanFileRows = fileRows.filter(r => r.url && String(r.url).trim() !== '');
    if (cleanFileRows.length) {
      const { error } = await admin.from('report_files').insert(cleanFileRows);
      if (error) throw error;
    }

    console.log('PUT /api/reports completed', { id: reportId });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('PUT /api/reports/[id] failed:', err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}

// Optional: allow POST to behave like PUT to avoid 405s during rollout
export async function POST(req: Request, ctx: { params: { id: string } }) {
  return PUT(req, ctx as any);
}