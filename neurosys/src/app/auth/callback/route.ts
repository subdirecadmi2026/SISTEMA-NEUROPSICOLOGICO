import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const destination = new URL(next, request.url);

  if (!code) {
    const login = new URL("/login", request.url);
    login.searchParams.set("error", "enlace_invalido");
    return NextResponse.redirect(login);
  }

  const supabase = await createClient();
  if (!supabase) {
    const login = new URL("/login", request.url);
    login.searchParams.set("error", "configuracion");
    return NextResponse.redirect(login);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const login = new URL("/login", request.url);
    login.searchParams.set("error", "enlace_expirado");
    return NextResponse.redirect(login);
  }

  return NextResponse.redirect(destination);
}
