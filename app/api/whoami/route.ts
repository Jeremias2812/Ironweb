import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseClient";

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, user: data.user ?? null });
}
