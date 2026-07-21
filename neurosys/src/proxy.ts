import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseConfig,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) {
    if (process.env.VERCEL) {
      return new NextResponse(
        "NeuroSys requiere NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en Vercel.",
        { status: 503 },
      );
    }
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
  const pathname = request.nextUrl.pathname;
  const isLoginRoute = pathname.startsWith("/login");
  const isRecoveryRoute = pathname.startsWith("/recuperar-contrasena");
  const isCallbackRoute = pathname.startsWith("/auth/callback");
  const isOnboardingRoute = request.nextUrl.pathname.startsWith("/onboarding");
  const isHealthRoute = request.nextUrl.pathname === "/api/health";

  function redirectWithCookies(pathname: string, next?: string) {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    if (next) url.searchParams.set("next", next);
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  if (isHealthRoute || isRecoveryRoute || isCallbackRoute) return response;

  if (!user && !isLoginRoute) {
    return redirectWithCookies("/login", request.nextUrl.pathname);
  }

  if (user && isLoginRoute) {
    return redirectWithCookies("/");
  }

  if (user) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    if (!membership && !isOnboardingRoute) {
      return redirectWithCookies("/onboarding");
    }
    if (membership && isOnboardingRoute) {
      return redirectWithCookies("/");
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
