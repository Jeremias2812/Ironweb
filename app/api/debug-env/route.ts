import { NextResponse } from "next/server";

// Fuerza comportamiento dinámico (evita caching de Next)
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ ok: false, error: 'Not available' }, { status: 404 });
  }

  const body = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    nodeEnv: process.env.NODE_ENV, // útil para saber si estás en 'development' o 'production'
  };

  const res = NextResponse.json(body);
  // Evita que se cachee en el navegador/proxy
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
