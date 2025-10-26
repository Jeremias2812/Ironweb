import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { PDFDocument } from "pdf-lib";
import playwright from "playwright";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
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

    // === 3. Convierte los bytes a ArrayBuffer para subir ===
    const arrayBuffer: ArrayBuffer =
      bytes instanceof Uint8Array
        ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
        : (bytes as any).buffer
        ? (bytes as Buffer).buffer.slice(
            (bytes as Buffer).byteOffset,
            (bytes as Buffer).byteOffset + (bytes as Buffer).byteLength
          )
        : (bytes as ArrayBuffer);

    // === 4. Sube el PDF a Supabase Storage ===
    const bucket = "certifications";
    const fileName = `${id}-${Date.now()}.pdf`;

    const { data: up, error: upErr } = await supabase.storage
      .from(bucket)
      .upload(fileName, arrayBuffer, {
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
