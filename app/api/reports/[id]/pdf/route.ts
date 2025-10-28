
/**
 * PDF generation route for Reports
 * --------------------------------
 * Goals:
 * 1) Mantener el PDF **idéntico** a la vista previa (mismo DOM/CSS).
 * 2) Hidratar datos **server-side** (Service Role) para que funcione sin sesión.
 * 3) Cubrir el campo "Identificador interno" replicando la lógica de preview.
 *
 * Flujo:
 * - Resuelve el reporte por id o report_number.
 * - Prefetch de todas las tablas relacionadas (methods, ut(+points), pm, tests, seal, files).
 * - Resuelve `internal_code` priorizando:
 *   a) tabla `internal_code` (último por updated_at),
 *   b) `parts.internal_code`,
 *   c) `report.part_code`/`report.internal_code`.
 * - Inyecta payload interceptando `/api/reports/:id` para la página de preview.
 * - Abre `/work-orders/:wo/reports?reportId=...&server=1&view=preview&print=1` y genera el PDF.
 *
 * Parámetros relevantes de la URL de preview:
 * - reportId: id del informe que se está imprimiendo.
 * - server=1: activa hidratación desde payload/Service Role dentro de la preview.
 * - view=preview: usa la misma plantilla que ve el usuario.
 * - print=1: abre el diálogo de impresión (el PDF respeta CSS @media print).
 *
 * Mantenimiento:
 * - Si cambian nombres de columnas/propiedades en preview, ajustar el payload aquí
 *   para mantener compatibilidad sin tocar el layout.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // fallback local

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const requireModule = createRequire(import.meta.url);
  const candidates = ['playwright', 'playwright-core'];
  let chromium: any = null;
  let lastError: unknown = null;

  for (const moduleName of candidates) {
    try {
      const mod = requireModule(moduleName) as any;
      chromium = mod?.chromium ?? mod?.default?.chromium ?? null;
      if (chromium) break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!chromium) {
    console.error('Playwright no está disponible en el servidor', lastError);
    return NextResponse.json({ error: 'Playwright no está disponible en el servidor' }, { status: 500 });
  }
  const reportId = params.id;

  try {
    // 1) Resolve work_order_id to build the preview URL
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

    // Try by id, else by report_number fallback
    let { data: rep, error } = await admin
      .from('reports')
      .select('id, work_order_id')
      .eq('id', reportId)
      .maybeSingle();

    if (!rep) {
      const q1 = await admin
        .from('reports')
        .select('id, work_order_id')
        .eq('report_number', reportId)
        .maybeSingle();
      rep = q1.data as any;
      error = q1.error as any;
      if (!rep && /^\d+$/.test(reportId)) {
        const q2 = await admin
          .from('reports')
          .select('id, work_order_id')
          .eq('report_number', Number(reportId))
          .maybeSingle();
        rep = q2.data as any;
        error = q2.error as any;
      }
    }

    if (error) throw error;
    if (!rep) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    // Fetch full report row with all columns (the first query only selected id/work_order_id)
    const fullRep = await admin
      .from('reports')
      .select('*')
      .eq('id', rep.id)
      .maybeSingle();
    if (fullRep.error) throw fullRep.error;
    const report = fullRep.data as any;

    // Prefetch full report payload (server-side) to inject into the preview via request interception
    const [methodsRes, utRes, pmRes, testsRes, sealRes, filesRes] = await Promise.all([
      admin.from('report_methods').select('method, result, acceptance, notes').eq('report_id', report.id),
      admin.from('report_ut').select('id, instrument_id, instrument_exp, step_wedge_id, step_wedge_exp').eq('report_id', report.id).maybeSingle(),
      admin.from('report_pm').select('*').eq('report_id', report.id).maybeSingle(),
      admin.from('report_tests').select('*').eq('report_id', report.id),
      admin.from('report_seals').select('seal_type, due_date').eq('report_id', report.id).maybeSingle(),
      admin.from('report_files').select('section, url').eq('report_id', report.id),
    ]);

    let utPoints: any[] = [];
    if (utRes.data?.id) {
      const pts = await admin
        .from('report_ut_points')
        .select('point, min_mm, actual_mm')
        .eq('ut_id', utRes.data.id)
        .order('point', { ascending: true });
      utPoints = pts.data ?? [];
    }

    // --- INTERNAL CODE RESOLUTION (keeps PDF in sync with preview) ---
    // Optional: fetch part internal code (prefer table `internal_code`, fallback to `parts.internal_code` or report.part_code)
    let partInternalCode: string | null = null;
    if (report?.part_id) {
      // 1) Try dedicated table `internal_code`
      const icRes = await admin
        .from('internal_code')
        .select('code, internal_code, updated_at')
        .eq('part_id', report.part_id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (icRes.data) {
        partInternalCode = (icRes.data as any).code ?? (icRes.data as any).internal_code ?? null;
      }

      // 2) Fallback to parts.internal_code if still empty
      if (!partInternalCode) {
        const partRes = await admin
          .from('parts')
          .select('internal_code')
          .eq('id', report.part_id)
          .maybeSingle();
        if (partRes.data && (partRes.data as any).internal_code) {
          partInternalCode = (partRes.data as any).internal_code as string;
        }
      }
    }

    // Normalize internal code value and mirror into the report row
    const internalCode = partInternalCode ?? (report as any).internal_code ?? (report as any).part_code ?? null;
    const reportWithIC = { ...report, internal_code: internalCode, part_code: internalCode };

    const payload = {
      report: reportWithIC,
      internal_code: internalCode,
      methods: methodsRes.data ?? [],
      ut: utRes.data ? {
        instrument_id: utRes.data.instrument_id || '',
        instrument_exp: utRes.data.instrument_exp || '',
        step_wedge_id: utRes.data.step_wedge_id || '',
        step_wedge_exp: utRes.data.step_wedge_exp || '',
        points: utPoints || [],
      } : null,
      pm: pmRes.data ?? null,
      tests: testsRes.data ?? [],
      seal: sealRes.data ?? null,
      files: {
        photos: (filesRes.data || []).filter((f: any) => f.section === 'photos').map((f: any) => f.url),
        ut_sketch: (filesRes.data || []).find((f: any) => f.section === 'ut_sketch')?.url || null,
        signature: (filesRes.data || []).find((f: any) => f.section === 'signature')?.url || null,
      },
      part_code: internalCode,
    };

    const h = headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    const proto = h.get('x-forwarded-proto') || 'http';
    const origin = `${proto}://${host}`;

    const printUrl = new URL(`${origin}/work-orders/${report.work_order_id}/reports`);
    printUrl.searchParams.set('reportId', report.id);
    printUrl.searchParams.set('print', '1');
    printUrl.searchParams.set('server', '1');
    printUrl.searchParams.set('view', 'preview');

    // 2) Launch Chromium headless; forward cookies to preserve session
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ deviceScaleFactor: 2, javaScriptEnabled: true });

    // --- Intercept preview's /api/reports/:id to inject the server payload (no browser session required)
    // Intercept the preview's call to our internal API so it receives the server-side payload even without a browser session
    const escapedOrigin = origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const apiReportRegex = new RegExp(`^${escapedOrigin}/api/reports/${report.id}(?:\\?.*)?$`);
    await context.route(apiReportRegex, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });

    const cookieHeader = h.get('cookie') || '';
    if (cookieHeader && host) {
      const domain = host.split(':')[0];
      const secure = proto === 'https';
      const parsed = cookieHeader.split(';').map(s => {
        const [name, ...rest] = s.trim().split('=');
        return { name, value: rest.join('=') };
      }).filter(c => c.name);
      if (parsed.length) {
        await context.addCookies(parsed.map(c => ({
          name: c.name,
          value: c.value,
          domain,
          path: '/',
          secure,
          httpOnly: false,
          sameSite: 'Lax',
        })));
      }
    }

    const page = await context.newPage();
    await page.goto(printUrl.toString(), { waitUntil: 'networkidle' });
    try {
      await page.waitForSelector('.a4-page', { timeout: 15000 });
    } catch {
      // fallback: ensure DOM is settled if selector changed
      await page.waitForLoadState('networkidle');
    }
    await page.emulateMedia({ media: 'print' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    await browser.close();

    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="informe_${report.id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('[pdf-route] error:', err?.message || err);
    return NextResponse.json({ error: 'Error generating PDF', detail: err?.message || String(err) }, { status: 500 });
  }
}