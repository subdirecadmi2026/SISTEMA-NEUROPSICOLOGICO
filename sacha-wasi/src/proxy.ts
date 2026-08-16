import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseConfig,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

/**
 * Hybrid auth: demo uses localStorage (client), cloud uses Supabase cookies.
 * Do NOT gate routes server-side — AppShell redirects when there is no local session.
 * When Supabase is configured we only refresh the auth cookie if a session exists.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured) {
    return response;
  }

  try {
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

    // Refresh session if present; ignore failures (demo mode still works).
    await Promise.race([
      supabase.auth.getUser(),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch {
    // Network / DNS failures must not block the app.
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
