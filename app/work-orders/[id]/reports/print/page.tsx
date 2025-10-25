// app/work-orders/[id]/reports/print/page.tsx
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type SearchParams = Record<string, string | string[] | undefined>;

export default function PrintRedirect({ params, searchParams }: { params: { id: string }, searchParams: SearchParams }) {
  const workOrderId = params.id;

  // Normalizamos los query params que nos interesan
  const reportId = typeof searchParams?.reportId === 'string' ? searchParams.reportId : '';
  const coverOnly = searchParams?.coverOnly === '1' || searchParams?.coverOnly === 'true';

  // Si tenemos reportId, redirigimos al endpoint real de PDF del backend
  // Ajusta esta ruta si tu API expone otro path
  if (reportId) {
    const q = new URLSearchParams();
    if (coverOnly) q.set('coverOnly', '1');
    const query = q.toString();
    const apiTarget = `/api/reports/${encodeURIComponent(reportId)}/pdf${query ? `?${query}` : ''}`;
    redirect(apiTarget);
  }

  // Fallback: si no hay reportId todavía, mandamos a la vista previa con print
  // (de esta forma no rompemos el flujo mientras no existe un informe persistido)
  const previewTarget = `/work-orders/${encodeURIComponent(workOrderId)}/reports?view=preview&print=1&server=1`;
  redirect(previewTarget);
}
