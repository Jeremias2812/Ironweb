// app/api/certifications/[id]/pdf/route.ts (v2)
import { NextResponse } from 'next/server';
import { createClient as createSB } from '@supabase/supabase-js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function envReq(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function makeAdmin() {
  const url = envReq('NEXT_PUBLIC_SUPABASE_URL');
  const key = envReq('SUPABASE_SERVICE_ROLE_KEY'); // ⚠️ Server only
  return createSB(url, key, { auth: { persistSession: false } });
}

type CertItemRow = {
  id: string;
  sort_order: number;
  report: { id: string; report_number: string | null; part_id: string | null } | null;
  part: { id: string; code: string | null; client: string | null } | null;
};

// === Helper: genera un PDF "por informe" (placeholder) ===
// En el futuro, aquí conectamos la plantilla real por pieza.
async function buildReportPdfPlaceholder(label: string) {
  const child = await PDFDocument.create();
  const font = await child.embedFont(StandardFonts.Helvetica);
  const fontB = await child.embedFont(StandardFonts.HelveticaBold);
  const draw = (p: any, t: string, x: number, y: number, s = 12, b = false) =>
    p.drawText(t || '', { x, y, size: s, font: b ? fontB : font, color: rgb(0, 0, 0) });

  // Creamos 3 páginas de ejemplo como suele tener cada pieza (VT/UT/PM).
  for (let i = 0; i < 3; i++) {
    const pg = child.addPage([595.28, 841.89]);
    draw(pg, label, 60, 780, 12, true);
    draw(pg, `Página ${i + 1} (placeholder informe)`, 60, 760, 11);
  }
  const bytes = await child.save();
  return bytes;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = makeAdmin();
    const id = params.id;

    // 1) Cargar certificación + items ordenados
    const { data: cert, error: e1 } = await supabase
      .from('certifications')
      .select('id, code, title, customer, date, status, notes, created_at')
      .eq('id', id)
      .maybeSingle();
    if (e1) throw e1;
    if (!cert) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: itemsRaw, error: e2 } = await supabase
      .from('certification_items')
      .select(`
        id, sort_order,
        report:reports(id, report_number, part_id),
        part:parts(id, code, client)
      `)
      .eq('certification_id', id)
      .order('sort_order', { ascending: true });
    if (e2) throw e2;

    const items: CertItemRow[] = (itemsRaw as any) || [];

    // 2) Generar PDFs por informe (placeholder) para conocer pages_count
    //    En el futuro, reemplazar por el generador real por pieza.
    const perItemPdfBytes: Uint8Array[] = [];
    const perItemPageCounts: number[] = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const label = `${it.part?.code || '—'} · ${it.part?.client || '—'} · ${it.report?.report_number || it.report?.id?.slice(0, 8) || '—'}`;
      const bytes = await buildReportPdfPlaceholder(label);
      perItemPdfBytes.push(bytes);
      const tmp = await PDFDocument.load(bytes);
      perItemPageCounts.push(tmp.getPageCount());
    }

    // 3) Crear PDF final (portada + índice + merge de todos los informes)
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontB = await pdf.embedFont(StandardFonts.HelveticaBold);
    const draw = (p: any, t: string, x: number, y: number, s = 12, b = false) =>
      p.drawText(t || '', { x, y, size: s, font: b ? fontB : font, color: rgb(0, 0, 0) });

    // A) Portada
    pdf.addPage([595.28, 841.89]);
    const pCover = pdf.getPage(0);
    draw(pCover, 'CERTIFICACIÓN', 60, 780, 20, true);
    draw(pCover, cert.title || '—', 60, 750, 14, true);
    draw(pCover, `Cliente: ${cert.customer || '—'}`, 60, 720, 12);
    draw(pCover, `Fecha: ${cert.date ? new Date(cert.date).toLocaleDateString() : '—'}`, 60, 700, 12);
    draw(pCover, `Código: ${cert.code || cert.id}`, 60, 680, 12);
    draw(pCover, `Generado: ${new Date().toLocaleString()}`, 60, 660, 10);

    // B) Índice: calcular cuántas páginas ocupa
    const idxStartY = 750;
    const lineH = 16;
    const rows: { label: string; page: number }[] = [];
    const rowsPerIndexPage = Math.floor((idxStartY - 120) / lineH);

    // sumatoria para saber páginas de cuerpo
    const bodyStartPage = 1 /* portada */ + Math.max(1, Math.ceil(items.length / rowsPerIndexPage));

    // calcular página de inicio por ítem y construir labels
    let running = bodyStartPage;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const count = perItemPageCounts[i] || 1;
      const label = `${String(i + 1).padStart(2, '0')}  ${it.part?.code || '—'}  ·  ${it.report?.report_number || it.report?.id?.slice(0, 8) || '—'}`;
      rows.push({ label, page: running });
      running += count;
    }

    // Escribir índice (puede ocupar varias páginas)
    const totalIndexPages = Math.max(1, Math.ceil(rows.length / rowsPerIndexPage));
    for (let ip = 0; ip < totalIndexPages; ip++) {
      const pIndex = pdf.addPage([595.28, 841.89]);
      draw(pIndex, 'ÍNDICE', 60, 780, 16, true);
      let y = idxStartY;
      for (let r = ip * rowsPerIndexPage; r < Math.min((ip + 1) * rowsPerIndexPage, rows.length); r++) {
        const row = rows[r];
        draw(pIndex, row.label, 60, y, 12);
        draw(pIndex, String(row.page), 520, y, 12);
        y -= lineH;
      }
    }

    // C) Merge de los PDFs individuales
    //    (importamos páginas al documento final, en orden)
    let bodyFirstIndex = 1 /*portada*/ + totalIndexPages; // índice empieza en la página 2
    // por claridad: las páginas de cuerpo se agregarán al final con importPages

    for (let i = 0; i < items.length; i++) {
      const bytes = perItemPdfBytes[i];
      const src = await PDFDocument.load(bytes);
      const pages = await pdf.copyPages(src, src.getPageIndices());
      for (const pg of pages) pdf.addPage(pg);
    }

    // D) Numeración de páginas (simple, abajo a la derecha)
    const totalPages = pdf.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const page = pdf.getPage(i);
      const label = `${i + 1} / ${totalPages}`;
      page.drawText(label, { x: 520, y: 20, size: 9, font, color: rgb(0, 0, 0) });
    }

    const bytes = await pdf.save();

    // 4) Persistir starts_at_page y pages_count en certification_items
    //    y opcionalmente guardar el PDF en Storage.
    const updates = items.map((it, i) => ({
      id: it.id,
      starts_at_page: rows[i]?.page ?? null,
      pages_count: perItemPageCounts[i] ?? null,
    }));

    // upsert por lotes (update uno a uno para simplicidad)
    for (const u of updates) {
      await supabase.from('certification_items').update({
        starts_at_page: u.starts_at_page,
        pages_count: u.pages_count,
      }).eq('id', u.id);
    }

    // 5) ¿Guardar en Storage y registrar en certification_files?
    const url = new URL(_req.url);
    const shouldStore = url.searchParams.get('store') === '1';

    let fileUrl: string | null = null;
    if (shouldStore) {
      const bucket = 'certifications';
      const fileName = `${id}-${Date.now()}.pdf`;
      const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const { data: up, error: upErr } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, { contentType: 'application/pdf', upsert: false });
      if (upErr) throw upErr;

      // Pública o firmada
      const { data: pub } = await supabase.storage.from(bucket).getPublicUrl(up.path);
      let downloadUrl = pub.publicUrl;
      if (!downloadUrl || downloadUrl.includes('/object/sign/')) {
        const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(up.path, 60 * 60);
        if (signed?.signedUrl) downloadUrl = signed.signedUrl;
      }
      fileUrl = downloadUrl || null;

      await supabase.from('certification_files').insert({
        certification_id: id,
        pdf_url: fileUrl,
        template_version: 'v2-placeholder',
        pages_total: totalPages,
      });
    }

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="cert-${cert.code || cert.id}.pdf"`,
        ...(fileUrl ? { 'X-File-Url': fileUrl } : {}),
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}