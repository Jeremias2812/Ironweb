// API de diagnóstico para "parts"
// Devuelve las últimas 5 piezas con los campos principales.
// Solo accesible en entorno de desarrollo (NODE_ENV=development).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseClient";

// Forzamos que esta ruta sea dinámica para evitar caching de Next.js
export const dynamic = "force-dynamic";

export async function GET() {
  // Bloquea el acceso en producción
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ ok: false, error: 'Not available' }, { status: 404 });
  }
  const supabase = createClient();
  // Consulta a Supabase: tabla parts, selecciona campos nuevos y ordena por creación
  const { data, error } = await supabase
    .from("parts")
    .select("id, numero_parte, numero_serie, internal_code, type, brand, client, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  // Construye la respuesta JSON de diagnóstico
  const res = NextResponse.json({
    ok: !Boolean(error),
    error: error?.message ?? null,
    rows: data?.length ?? 0,
    data: data ?? [],
  });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
