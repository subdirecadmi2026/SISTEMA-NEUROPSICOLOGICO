import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function GET() {
  return NextResponse.json(
    {
      status: isSupabaseConfigured ? "ok" : "configuration_required",
      service: "neurosys",
      supabase: isSupabaseConfigured ? "configured" : "missing",
    },
    { status: isSupabaseConfigured ? 200 : 503 },
  );
}
