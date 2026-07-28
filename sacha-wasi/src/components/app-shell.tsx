"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogOut } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useDemo } from "@/lib/demo-store";
import { canAccess, NAV_ITEMS, ROLE_LABELS } from "@/lib/roles";
import type { Role } from "@/types";

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const { ready, user, logout, sucursalId, sucursales, setSucursalId, alerts } =
    useDemo();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--sw-bg)] text-[var(--sw-ink)]">
        <p className="text-sm tracking-wide opacity-70">Cargando Sacha Wasi…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--sw-bg)] text-[var(--sw-ink)]">
        <p className="text-sm tracking-wide opacity-70">Redirigiendo al login…</p>
        <Link
          href="/login"
          className="rounded-xl bg-[var(--sw-forest)] px-4 py-2 text-sm text-white"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  const role = user.role as Role;
  const links = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const sucursal = sucursales.find((s) => s.id === sucursalId);

  return (
    <div className="min-h-screen bg-[var(--sw-bg)] text-[var(--sw-ink)]">
      <div className="sw-atmosphere" aria-hidden />
      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--sw-line)] bg-[var(--sw-panel)]/90 p-5 backdrop-blur md:flex">
          <Link href="/" className="mb-8 flex items-center gap-3">
            <BrandLogo variant="mark" size={48} className="shrink-0 drop-shadow-sm" />
            <div>
              <p className="font-[family-name:var(--font-display)] text-xl leading-none tracking-tight">
                Sacha Wasi
              </p>
              <p className="mt-1 text-xs text-[var(--sw-muted)]">Gestión multi‑sucursal</p>
            </div>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {links.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-3 py-2.5 text-sm transition ${
                    active
                      ? "bg-[var(--sw-forest)] text-[var(--sw-cream)]"
                      : "text-[var(--sw-ink)]/80 hover:bg-[var(--sw-forest)]/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 space-y-3 border-t border-[var(--sw-line)] pt-4">
            <div>
              <p className="text-sm font-medium">{user.full_name}</p>
              <p className="text-xs text-[var(--sw-muted)]">{ROLE_LABELS[role]}</p>
            </div>
            {role === "admin" || role === "supervisor" ? (
              <label className="block text-xs text-[var(--sw-muted)]">
                Sucursal
                <select
                  className="mt-1 w-full rounded-lg border border-[var(--sw-line)] bg-white px-2 py-2 text-sm text-[var(--sw-ink)]"
                  value={sucursalId}
                  onChange={(e) => setSucursalId(e.target.value)}
                >
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="text-xs text-[var(--sw-muted)]">{sucursal?.name}</p>
            )}
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="inline-flex items-center gap-2 text-sm text-[var(--sw-chili)] hover:underline"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-8">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--sw-muted)]">
                {sucursal?.name ?? "Todas las sucursales"}
              </p>
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 max-w-2xl text-sm text-[var(--sw-muted)]">{subtitle}</p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-2">
              {alerts.length > 0 ? (
                <div className="max-w-xs rounded-2xl border border-[var(--sw-chili)]/30 bg-[var(--sw-chili)]/10 px-3 py-2 text-xs">
                  <p className="font-semibold">
                    {alerts.length} alerta{alerts.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-[var(--sw-muted)]">{alerts[0].title}: {alerts[0].body}</p>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2 md:hidden">
                {links.slice(0, 5).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-3 py-1.5 text-xs ${
                      pathname === item.href
                        ? "bg-[var(--sw-forest)] text-white"
                        : "bg-white/70 text-[var(--sw-ink)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </header>

          {!canAccess(role, pathname) ? (
            <div className="rounded-2xl border border-[var(--sw-chili)]/30 bg-white/70 p-6">
              No tienes permiso para este módulo.
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
