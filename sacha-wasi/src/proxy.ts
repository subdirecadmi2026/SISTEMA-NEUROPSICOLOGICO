import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseConfig,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  // Modo demo: sin Supabase no hay gate server-side (auth es localStorage).
  if (!isSupabaseConfigured) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseConfig();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  const isHealthRoute = request.nextUrl.pathname === "/api/health";

  if (isHealthRoute) return response;

  function redirectWithCookies(pathname: string, next?: string) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = pathname;
    redirectUrl.search = "";
    if (next) redirectUrl.searchParams.set("next", next);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  if (!user && !isAuthRoute) {
    return redirectWithCookies("/login", request.nextUrl.pathname);
  }

  if (user && isAuthRoute) {
    return redirectWithCookies("/");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
