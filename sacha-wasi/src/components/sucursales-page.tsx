"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useDemo } from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/client";

type RemoteSucursal = {
  id: string;
  name: string;
  address: string;
  timezone: string;
  active: boolean;
};

export function SucursalesPage() {
  const { sucursales, setSucursalId, user } = useDemo();
  const [remote, setRemote] = useState<RemoteSucursal[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase
      .from("sucursales")
      .select("id, name, address, timezone, active")
      .order("name")
      .then(({ data, error }) => {
        if (error) {
          setMessage(error.message);
          return;
        }
        setRemote((data as RemoteSucursal[]) ?? []);
      });
  }, []);

  async function createRemote() {
    const supabase = createClient();
    if (!supabase) {
      setMessage("Supabase no configurado");
      return;
    }
    const { data, error } = await supabase
      .from("sucursales")
      .insert({
        name,
        address,
        timezone: "America/Lima",
        active: true,
      })
      .select("id, name, address, timezone, active")
      .single();
    if (error) {
      setMessage(error.message);
      return;
    }
    setRemote((prev) => [...prev, data as RemoteSucursal]);
    setName("");
    setAddress("");
    setMessage("Sucursal creada en Supabase");
  }

  const list = remote.length > 0 ? remote : sucursales;

  return (
    <AppShell
      title="Sucursales"
      subtitle="Multi‑sucursal: vista local demo y sincronización con Supabase cuando hay sesión cloud."
    >
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        {(user?.role === "admin" || user?.role === "supervisor") && (
          <form
            className="rounded-3xl border border-[var(--sw-line)] bg-[var(--sw-panel)]/95 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              void createRemote();
            }}
          >
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              Nueva sucursal (cloud)
            </h2>
            <label className="mt-4 block text-xs text-[var(--sw-muted)]">
              Nombre
              <input
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2.5 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="mt-3 block text-xs text-[var(--sw-muted)]">
              Dirección
              <input
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2.5 text-sm"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </label>
            <button
              type="submit"
              className="mt-4 w-full rounded-2xl bg-[var(--sw-forest)] py-3 text-sm font-semibold text-white"
            >
              Guardar en Supabase
            </button>
            {message ? (
              <p className="mt-2 text-center text-sm text-[var(--sw-forest)]">
                {message}
              </p>
            ) : null}
          </form>
        )}

        <section className="grid gap-3 md:grid-cols-2">
          {list.map((s) => (
            <article
              key={s.id}
              className="rounded-3xl border border-[var(--sw-line)] bg-white/85 p-5"
            >
              <p className="text-xs uppercase tracking-wide text-[var(--sw-muted)]">
                {s.timezone}
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl">
                {s.name}
              </h3>
              <p className="mt-2 text-sm text-[var(--sw-muted)]">{s.address}</p>
              <button
                type="button"
                className="mt-4 rounded-xl bg-[var(--sw-forest)] px-3 py-2 text-xs text-white"
                onClick={() => setSucursalId(s.id)}
              >
                Usar esta sucursal
              </button>
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
