import { NextResponse } from 'next/server';
import { getReportsByWorkOrder } from '@/lib/reports';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const reportsParam = searchParams.get('reports'); // ej: "all" o undefined
  const wid = params.id;

  // Si se pide "all", intentamos traer los informes reales de la OT
  let summaryLine = `OT ${wid} - Export ${reportsParam || 'single'}`;

  if (!reportsParam || reportsParam === 'all') {
    try {
      const items = await getReportsByWorkOrder(wid);
      if (items.length > 0) {
        const labels = items
          .map((r) => `${r.report_number ?? 's/n'} ${r.part_code ? `(${r.part_code})` : ''}`.trim())
          .join(' ; ');
        summaryLine = `OT ${wid} - ${items.length} informe(s): ${labels}`;
      } else {
        summaryLine = `OT ${wid} - sin informes asociados`;
      }
    } catch (e: any) {
      summaryLine = `OT ${wid} - error leyendo informes: ${e?.message || 'desconocido'}`;
    }
  }

  // Escapar caracteres problemáticos para PDF text string
  const text = summaryLine
    .replace(/\\/g, '\\\\') // primero backslash
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

  // PDF mínimo (placeholder) con la línea de resumen
  const minimalPdf = `%PDF-1.4
1 0 obj <</Type/Catalog/Pages 2 0 R>> endobj
2 0 obj <</Type/Pages/Count 1/Kids[3 0 R]>> endobj
3 0 obj <</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>> endobj
4 0 obj <</Length ${text.length + 40}>>stream
BT /F1 12 Tf 50 780 Td (${text}) Tj ET
endstream endobj
5 0 obj <</Type/Font/Subtype/Type1/BaseFont/Helvetica>> endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000190 00000 n 
0000000354 00000 n 
0000000460 00000 n 
trailer <</Root 1 0 R/Size 6>>
startxref
529
%%EOF`;

  const pdfBuffer = Buffer.from(minimalPdf, 'utf-8');

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="workorder-${wid}.pdf"`,
    },
  });
}