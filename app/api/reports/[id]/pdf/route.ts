import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";
import playwright from "playwright";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const id = params.id;

  try {
    // === 1. Obtén los datos del reporte ===
    const { data: report, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !report) {
      console.error("Error fetching report:", error);
      return NextResponse.json({ error: "No se encontró el informe" }, { status: 404 });
    }

    // === 2. Genera el PDF con Playwright ===
    const browser = await playwright.chromium.launch();
    const page = await browser.newPage();
    const url = `${process.env.NEXT_PUBLIC_SITE_URL}/work-orders/${report.work_order_id}/reports?reportId=${id}&server=1&view=preview`;

    await page.goto(url, { waitUntil: "networkidle" });
    const bytes = await page.pdf({ format: "A4" });
    await browser.close();

    // === 3. Prepara el cuerpo del archivo para subir (Buffer/Uint8Array es válido) ===
    // Playwright devuelve un Buffer (que es un Uint8Array). Supabase acepta ArrayBufferView.
    const fileBody = bytes as Uint8Array;

    // === 4. Sube el PDF a Supabase Storage ===
    const bucket = "certifications";
    const fileName = `${id}-${Date.now()}.pdf`;

    const { data: up, error: upErr } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBody, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (upErr) {
      console.error("Error uploading PDF:", upErr);
      return NextResponse.json({ error: "Error al subir el PDF" }, { status: 500 });
    }

    // === 5. Devuelve la URL pública ===
    const { data: publicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl.publicUrl });
  } catch (err: any) {
    console.error("Error generating PDF:", err);
    return NextResponse.json({ error: "Error al generar el PDF" }, { status: 500 });
  }
}
