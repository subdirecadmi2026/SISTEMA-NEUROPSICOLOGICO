import { NextResponse } from "next/server";
import {
  getSupabaseConfig,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

export async function GET() {
  const supabase: {
    configured: boolean;
    reachable: boolean;
    schemaReady: boolean | null;
    detail?: string;
  } = {
    configured: isSupabaseConfigured,
    reachable: false,
    schemaReady: null,
  };

  if (isSupabaseConfigured) {
    try {
      const { url, publishableKey } = getSupabaseConfig();
      const authRes = await fetch(`${url}/auth/v1/health`, {
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`,
        },
        cache: "no-store",
      });
      supabase.reachable = authRes.ok;

      const tableRes = await fetch(
        `${url}/rest/v1/sucursales?select=id&limit=1`,
        {
          headers: {
            apikey: publishableKey,
            Authorization: `Bearer ${publishableKey}`,
          },
          cache: "no-store",
        },
      );
      if (tableRes.status === 404) {
        supabase.schemaReady = false;
        supabase.detail =
          "Auth OK. Falta ejecutar supabase/SETUP.sql en el SQL Editor.";
      } else if (tableRes.ok || tableRes.status === 200 || tableRes.status === 401 || tableRes.status === 403) {
        // 401/403 can mean table exists but RLS blocks anon without user
        supabase.schemaReady = true;
      } else {
        const body = await tableRes.text();
        supabase.schemaReady = !body.includes("PGRST205");
        if (!supabase.schemaReady) {
          supabase.detail =
            "Auth OK. Falta ejecutar supabase/SETUP.sql en el SQL Editor.";
        }
      }
    } catch (error) {
      supabase.detail =
        error instanceof Error ? error.message : "Error al contactar Supabase";
    }
  }

  return NextResponse.json({
    ok: true,
    service: "sacha-wasi",
    mode: isSupabaseConfigured ? "supabase" : "demo",
    supabase,
    timestamp: new Date().toISOString(),
  });
}
