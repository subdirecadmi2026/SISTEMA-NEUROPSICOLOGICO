import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "sacha-wasi",
    mode: isSupabaseConfigured ? "supabase" : "demo",
    timestamp: new Date().toISOString(),
  });
}
