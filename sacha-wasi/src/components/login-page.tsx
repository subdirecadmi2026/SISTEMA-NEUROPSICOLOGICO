"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { DEMO_PASSWORD, DEMO_USERS } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";
import { bootstrapProfile, signInWithSupabase } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Role } from "@/types";

type HealthPayload = {
  mode: string;
  supabase?: {
    configured: boolean;
    reachable: boolean;
    schemaReady: boolean | null;
    detail?: string;
  };
};

export function LoginPage() {
  const { ready, user, login, loginAsProfile } = useDemo();
  const router = useRouter();
  const [email, setEmail] = useState("admin@sachawasi.pe");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"demo" | "cloud">(
    isSupabaseConfigured ? "cloud" : "demo",
  );
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [pendingBootstrap, setPendingBootstrap] = useState<{
    userId: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((r) => r.json())
      .then((data: HealthPayload) => {
        if (!cancelled) setHealth(data);
      })
      .catch(() => {
        if (!cancelled) setHealth(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "cloud" && isSupabaseConfigured) {
        const cloud = await signInWithSupabase(email, password);
        if (cloud.ok) {
          const result = loginAsProfile(cloud.profile);
          router.push(result.redirect ?? "/");
          return;
        }
        if (cloud.needsProfile && cloud.userId && cloud.email) {
          setPendingBootstrap({ userId: cloud.userId, email: cloud.email });
          setError(cloud.message);
          return;
        }
        // fallback demo if cloud fails with invalid credentials style
        const demo = login(email, password);
        if (demo.ok) {
          router.push(demo.redirect ?? "/");
          return;
        }
        setError(cloud.message);
        return;
      }

      const result = login(email, password);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(result.redirect ?? "/");
    } finally {
      setBusy(false);
    }
  }

  async function createAdminProfile() {
    if (!pendingBootstrap) return;
    setBusy(true);
    setError(null);
    try {
      const result = await bootstrapProfile({
        userId: pendingBootstrap.userId,
        email: pendingBootstrap.email,
        fullName: "Admin Sacha Wasi",
        role: "admin" as Role,
        sucursalId: null,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const local = loginAsProfile(result.profile);
      router.push(local.redirect ?? "/");
    } finally {
      setBusy(false);
    }
  }

  const sb = health?.supabase;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="sw-atmosphere" aria-hidden />
      <div className="sw-login-glow" aria-hidden />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[var(--sw-line)] bg-[var(--sw-panel)]/90 shadow-[0_30px_80px_rgba(20,50,40,0.18)] backdrop-blur md:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden min-h-[520px] md:block">
          <div className="absolute inset-0 bg-[linear-gradient(155deg,#0b5a2a_0%,#134d2a_45%,#1a3d24_100%)]" />
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_20%,rgba(183,227,90,0.45),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(212,175,55,0.25),transparent_40%)]" />
          <div className="relative flex h-full flex-col justify-between p-10 text-[var(--sw-cream)]">
            <div className="flex items-center gap-3">
              <BrandLogo
                variant="mark"
                size={56}
                className="rounded-xl bg-white/95 p-1.5"
                priority
              />
              <p className="font-[family-name:var(--font-display)] text-3xl">
                Sacha Wasi
              </p>
            </div>
            <div className="flex flex-col items-start gap-6">
              <BrandLogo
                variant="principal"
                size={210}
                className="drop-shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
                priority
              />
              <div>
                <h1 className="max-w-sm font-[family-name:var(--font-display)] text-4xl leading-tight">
                  Operación de comida rápida, controlada desde la selva hasta la caja.
                </h1>
                <p className="mt-4 max-w-sm text-sm text-white/80">
                  POS, cocina, recetas, inventario y reportes multi‑sucursal.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="p-8 md:p-10">
          <div className="mb-4 flex justify-center md:hidden">
            <BrandLogo variant="principal" size={120} priority />
          </div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--sw-muted)]">
            Acceso
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--sw-ink)]">
            Entrar al sistema
          </h2>

          {sb ? (
            <div
              className={`mt-4 rounded-2xl border px-3 py-2 text-xs ${
                sb.schemaReady
                  ? "border-[var(--sw-forest)]/30 bg-[var(--sw-leaf)]/20"
                  : "border-[var(--sw-chili)]/30 bg-[var(--sw-chili)]/10"
              }`}
            >
              <p className="font-semibold">
                Supabase: {sb.reachable ? "conectado" : "sin respuesta"}
                {sb.schemaReady ? " · esquema listo" : ""}
              </p>
              <p className="mt-1 text-[var(--sw-muted)]">
                {sb.schemaReady
                  ? "Puedes entrar en modo Cloud (Auth) o Demo local."
                  : (sb.detail ?? "Ejecuta SETUP.sql")}
              </p>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("demo")}
              className={`rounded-xl px-3 py-2 text-sm ${
                mode === "demo"
                  ? "bg-[var(--sw-forest)] text-white"
                  : "bg-white border border-[var(--sw-line)]"
              }`}
            >
              Demo local
            </button>
            <button
              type="button"
              onClick={() => setMode("cloud")}
              className={`rounded-xl px-3 py-2 text-sm ${
                mode === "cloud"
                  ? "bg-[var(--sw-gold)] text-[var(--sw-ink)]"
                  : "bg-white border border-[var(--sw-line)]"
              }`}
            >
              Cloud Supabase
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-xs text-[var(--sw-muted)]">
              Email
              <input
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-3 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </label>
            <label className="block text-xs text-[var(--sw-muted)]">
              Contraseña
              <input
                type="password"
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-3 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            {error ? (
              <p className="text-sm text-[var(--sw-chili)]">{error}</p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl bg-[var(--sw-forest)] py-3.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Entrando…" : "Iniciar sesión"}
            </button>
          </form>

          {pendingBootstrap ? (
            <button
              type="button"
              disabled={busy}
              onClick={createAdminProfile}
              className="mt-3 w-full rounded-2xl border border-[var(--sw-gold)] bg-[var(--sw-gold)]/20 py-3 text-sm font-semibold"
            >
              Crear perfil admin en Supabase
            </button>
          ) : null}

          {mode === "demo" ? (
            <div className="mt-6 grid gap-2">
              <p className="text-xs text-[var(--sw-muted)]">
                Usuarios demo · contraseña <code>{DEMO_PASSWORD}</code>
              </p>
              {DEMO_USERS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setEmail(u.email);
                    setPassword(DEMO_PASSWORD);
                    setMode("demo");
                  }}
                  className="rounded-xl border border-[var(--sw-line)] bg-white/70 px-3 py-2 text-left text-xs hover:border-[var(--sw-forest)]"
                >
                  <span className="font-medium">{u.full_name}</span>
                  <span className="text-[var(--sw-muted)]"> · {u.email}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-[var(--sw-muted)]">
              Crea el usuario en Supabase → Authentication → Users (confirma email
              OFF para pruebas). Luego ejecuta{" "}
              <code>SETUP_PART2.sql</code> y entra aquí en modo Cloud.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
