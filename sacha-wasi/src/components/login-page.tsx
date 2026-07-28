"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Leaf } from "lucide-react";
import { DEMO_PASSWORD, DEMO_USERS } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";

export function LoginPage() {
  const { ready, user, login } = useDemo();
  const router = useRouter();
  const [email, setEmail] = useState("admin@sachawasi.pe");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = login(email, password);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push(result.redirect ?? "/");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="sw-atmosphere" aria-hidden />
      <div className="sw-login-glow" aria-hidden />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[var(--sw-line)] bg-[var(--sw-panel)]/90 shadow-[0_30px_80px_rgba(20,50,40,0.18)] backdrop-blur md:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden min-h-[520px] md:block">
          <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(27,77,62,0.92),rgba(14,40,32,0.75)),url('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center" />
          <div className="relative flex h-full flex-col justify-between p-10 text-[var(--sw-cream)]">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <Leaf className="h-6 w-6" />
              </span>
              <p className="font-[family-name:var(--font-display)] text-3xl">
                Sacha Wasi
              </p>
            </div>
            <div>
              <h1 className="max-w-sm font-[family-name:var(--font-display)] text-4xl leading-tight">
                Operación de comida rápida, controlada desde la selva hasta la caja.
              </h1>
              <p className="mt-4 max-w-sm text-sm text-white/80">
                POS, cocina, recetas, inventario y reportes multi‑sucursal. Listo
                para Vercel + Supabase.
              </p>
            </div>
          </div>
        </section>

        <section className="p-8 md:p-10">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--sw-muted)]">
            Acceso demo
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--sw-ink)]">
            Entrar al sistema
          </h2>
          <p className="mt-2 text-sm text-[var(--sw-muted)]">
            Usa un usuario demo. Contraseña: <code>{DEMO_PASSWORD}</code>
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
              className="w-full rounded-2xl bg-[var(--sw-forest)] py-3.5 text-sm font-semibold text-white"
            >
              Iniciar sesión
            </button>
          </form>

          <div className="mt-6 grid gap-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setEmail(u.email);
                  setPassword(DEMO_PASSWORD);
                }}
                className="rounded-xl border border-[var(--sw-line)] bg-white/70 px-3 py-2 text-left text-xs hover:border-[var(--sw-forest)]"
              >
                <span className="font-medium">{u.full_name}</span>
                <span className="text-[var(--sw-muted)]"> · {u.email}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
