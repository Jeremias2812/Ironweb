import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseClient";

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ ok: false, error: 'Not available' }, { status: 404 });
  }
  const supabase = createClient();
  const { data, error } = await supabase.from("parts").select("id, code").limit(1);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message });
  }
  return NextResponse.json({ ok: true, sample: data });
}
