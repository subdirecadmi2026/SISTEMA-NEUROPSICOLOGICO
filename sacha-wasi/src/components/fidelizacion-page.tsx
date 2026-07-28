"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { formatMoney } from "@/lib/currency";
import { useDemo } from "@/lib/demo-store";
import type { CouponType } from "@/types";

export function FidelizacionPage() {
  const { customers, coupons, upsertCustomer, upsertCoupon } = useDemo();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<CouponType>("percent");
  const [value, setValue] = useState("10");
  const [minTicket, setMinTicket] = useState("20");
  const [message, setMessage] = useState<string | null>(null);

  return (
    <AppShell
      title="Fidelización"
      subtitle="Clientes frecuentes, puntos por compra y cupones de descuento para el POS."
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-3xl border border-[var(--sw-line)] bg-white/85 p-5">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Clientes
          </h2>
          <form
            className="mt-4 grid gap-2 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              const result = upsertCustomer({ name, phone, email });
              setMessage(result.message);
              if (result.ok) {
                setName("");
                setPhone("");
                setEmail("");
              }
            }}
          >
            <input
              className="rounded-xl border border-[var(--sw-line)] px-3 py-2 text-sm"
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className="rounded-xl border border-[var(--sw-line)] px-3 py-2 text-sm"
              placeholder="Teléfono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <input
              className="rounded-xl border border-[var(--sw-line)] px-3 py-2 text-sm"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="submit"
              className="rounded-xl bg-[var(--sw-forest)] px-3 py-2 text-sm text-white md:col-span-3"
            >
              Registrar cliente
            </button>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {customers.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-[var(--sw-line)] px-3 py-2"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-[var(--sw-muted)]">
                    {c.phone} · {c.visits} visitas
                  </p>
                </div>
                <span className="rounded-lg bg-[var(--sw-leaf)]/30 px-2 py-1 text-xs font-semibold">
                  {c.points} pts
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-[var(--sw-line)] bg-[var(--sw-panel)]/95 p-5">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Cupones
          </h2>
          <form
            className="mt-4 grid gap-2 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const result = upsertCoupon({
                code,
                type,
                value: Number(value),
                active: true,
                min_ticket: Number(minTicket),
                max_uses: 100,
              });
              setMessage(result.message);
              if (result.ok) setCode("");
            }}
          >
            <input
              className="rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2 text-sm"
              placeholder="Código (ej. SELVA10)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <select
              className="rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as CouponType)}
            >
              <option value="percent">Porcentaje</option>
              <option value="fixed">Monto fijo</option>
            </select>
            <input
              type="number"
              className="rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2 text-sm"
              placeholder="Valor"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <input
              type="number"
              className="rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2 text-sm"
              placeholder="Ticket mínimo"
              value={minTicket}
              onChange={(e) => setMinTicket(e.target.value)}
            />
            <button
              type="submit"
              className="rounded-xl bg-[var(--sw-chili)] px-3 py-2 text-sm text-white md:col-span-2"
            >
              Crear cupón
            </button>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {coupons.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-[var(--sw-line)] bg-white/80 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{c.code}</p>
                  <p className="text-xs text-[var(--sw-muted)]">
                    {c.type === "percent" ? `${c.value}%` : formatMoney(c.value)}{" "}
                    · mín {formatMoney(c.min_ticket)} · usos {c.uses}
                    {c.max_uses ? `/${c.max_uses}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-lg px-2 py-1 text-xs ${
                    c.active ? "bg-[var(--sw-leaf)]/30" : "bg-[var(--sw-chili)]/15"
                  }`}
                >
                  {c.active ? "Activo" : "Inactivo"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {message ? (
        <p className="mt-4 text-center text-sm text-[var(--sw-forest)]">
          {message}
        </p>
      ) : null}
    </AppShell>
  );
}
