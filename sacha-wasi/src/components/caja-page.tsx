"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { formatDateTime, formatMoney } from "@/lib/currency";
import { useDemo } from "@/lib/demo-store";

export function CajaPage() {
  const { cash, closeCash, openCash, orders, users } = useDemo();
  const [closing, setClosing] = useState("");
  const [notes, setNotes] = useState("");
  const [opening, setOpening] = useState("150");
  const [message, setMessage] = useState<string | null>(null);

  const opener = users.find((u) => u.id === cash.opened_by);
  const cashSales = orders
    .filter(
      (o) =>
        o.payment_method === "efectivo" &&
        new Date(o.created_at) >= new Date(cash.opened_at) &&
        (!cash.closed_at || new Date(o.created_at) <= new Date(cash.closed_at)),
    )
    .reduce((s, o) => s + o.total, 0);

  const discrepancy =
    cash.closing_amount != null
      ? cash.closing_amount - cash.expected_cash
      : null;

  return (
    <AppShell
      title="Caja y conciliación"
      subtitle="Apertura, arqueo y cierre por turno con control de discrepancias."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-[var(--sw-line)] bg-white/85 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--sw-muted)]">
            Sesión actual
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
            {cash.closed_at ? "Cerrada" : "Abierta"}
          </h2>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-[var(--sw-muted)]">Abierta por</dt>
              <dd className="font-medium">{opener?.full_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--sw-muted)]">Apertura</dt>
              <dd className="font-medium">{formatDateTime(cash.opened_at)}</dd>
            </div>
            <div>
              <dt className="text-[var(--sw-muted)]">Fondo inicial</dt>
              <dd className="font-medium">{formatMoney(cash.opening_float)}</dd>
            </div>
            <div>
              <dt className="text-[var(--sw-muted)]">Ventas efectivo</dt>
              <dd className="font-medium">{formatMoney(cashSales)}</dd>
            </div>
            <div>
              <dt className="text-[var(--sw-muted)]">Esperado</dt>
              <dd className="font-medium">{formatMoney(cash.expected_cash)}</dd>
            </div>
            <div>
              <dt className="text-[var(--sw-muted)]">Cierre</dt>
              <dd className="font-medium">
                {cash.closed_at ? formatDateTime(cash.closed_at) : "—"}
              </dd>
            </div>
          </dl>
          {discrepancy != null ? (
            <p
              className={`mt-4 rounded-xl px-3 py-2 text-sm ${
                Math.abs(discrepancy) < 0.01
                  ? "bg-[var(--sw-leaf)]/25"
                  : "bg-[var(--sw-chili)]/15"
              }`}
            >
              Discrepancia: {formatMoney(discrepancy)}
            </p>
          ) : null}
        </section>

        <section className="rounded-3xl border border-[var(--sw-line)] bg-[var(--sw-panel)]/95 p-6">
          {!cash.closed_at ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const result = await closeCash(Number(closing), notes);
                setMessage(result.message);
              }}
              className="space-y-3"
            >
              <h3 className="font-[family-name:var(--font-display)] text-2xl">
                Cerrar caja
              </h3>
              <label className="block text-xs text-[var(--sw-muted)]">
                Monto contado
                <input
                  type="number"
                  step="0.01"
                  required
                  className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2.5 text-sm"
                  value={closing}
                  onChange={(e) => setClosing(e.target.value)}
                />
              </label>
              <label className="block text-xs text-[var(--sw-muted)]">
                Notas
                <textarea
                  className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2.5 text-sm"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-2xl bg-[var(--sw-chili)] py-3 text-sm font-semibold text-white"
              >
                Confirmar cierre
              </button>
            </form>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const result = await openCash(Number(opening));
                setMessage(result.message);
              }}
              className="space-y-3"
            >
              <h3 className="font-[family-name:var(--font-display)] text-2xl">
                Abrir caja
              </h3>
              <label className="block text-xs text-[var(--sw-muted)]">
                Fondo inicial
                <input
                  type="number"
                  step="0.01"
                  required
                  className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2.5 text-sm"
                  value={opening}
                  onChange={(e) => setOpening(e.target.value)}
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-2xl bg-[var(--sw-forest)] py-3 text-sm font-semibold text-white"
              >
                Abrir turno
              </button>
            </form>
          )}
          {message ? (
            <p className="mt-3 text-center text-sm text-[var(--sw-forest)]">
              {message}
            </p>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
