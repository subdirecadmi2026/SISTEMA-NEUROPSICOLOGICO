"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { formatMoney } from "@/lib/currency";
import { useDemo } from "@/lib/demo-store";

export function ReportesPage() {
  const { orders, products, insumos, sucursalId, recipeCost, recetas } = useDemo();

  const scoped = useMemo(
    () => orders.filter((o) => o.sucursal_id === sucursalId && o.status !== "cancelado"),
    [orders, sucursalId],
  );

  const salesToday = scoped.reduce((s, o) => s + o.total, 0);
  const ticketAvg = scoped.length ? salesToday / scoped.length : 0;

  const byProduct = new Map<string, { name: string; qty: number; total: number }>();
  for (const order of scoped) {
    for (const item of order.items) {
      const prev = byProduct.get(item.producto_id) ?? {
        name: item.producto_name,
        qty: 0,
        total: 0,
      };
      prev.qty += item.qty;
      prev.total += item.qty * item.unit_price;
      byProduct.set(item.producto_id, prev);
    }
  }

  const topProducts = [...byProduct.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 6);

  const margins = recetas
    .map((r) => {
      const product = products.find((p) => p.id === r.producto_id);
      const cost = recipeCost(r.id);
      return {
        name: product?.name ?? r.name,
        cost,
        price: product?.price ?? 0,
        margin: (product?.price ?? 0) - cost,
      };
    })
    .sort((a, b) => b.margin - a.margin);

  const criticalStock = insumos.filter(
    (i) => i.sucursal_id === sucursalId && i.stock <= i.min_stock,
  );

  function exportCsv() {
    const rows = [
      ["numero", "canal", "pago", "total", "estado", "creado"],
      ...scoped.map((o) => [
        o.numero,
        o.channel,
        o.payment_method,
        String(o.total),
        o.status,
        o.created_at,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sacha-wasi-ventas-${sucursalId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell
      title="Reportes"
      subtitle="Ventas, ticket promedio, top productos, margen por receta y stock crítico."
    >
      <div className="mb-5 flex justify-end">
        <button
          type="button"
          onClick={exportCsv}
          className="rounded-xl bg-[var(--sw-forest)] px-4 py-2 text-sm font-medium text-white"
        >
          Exportar CSV
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Ventas", value: formatMoney(salesToday) },
          { label: "Órdenes", value: String(scoped.length) },
          { label: "Ticket promedio", value: formatMoney(ticketAvg) },
          { label: "Stock crítico", value: String(criticalStock.length) },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-[var(--sw-line)] bg-white/85 p-4"
          >
            <p className="text-xs uppercase tracking-wide text-[var(--sw-muted)]">
              {kpi.label}
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-[var(--sw-line)] bg-white/85 p-5">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Top productos
          </h2>
          <ul className="mt-4 space-y-3">
            {topProducts.map((p) => (
              <li key={p.name} className="flex items-center justify-between text-sm">
                <span>
                  {p.name}{" "}
                  <span className="text-[var(--sw-muted)]">×{p.qty}</span>
                </span>
                <span className="font-medium">{formatMoney(p.total)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-[var(--sw-line)] bg-white/85 p-5">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Margen por plato
          </h2>
          <ul className="mt-4 space-y-3">
            {margins.map((m) => (
              <li key={m.name} className="flex items-center justify-between text-sm">
                <span>{m.name}</span>
                <span className="font-medium text-[var(--sw-forest)]">
                  {formatMoney(m.margin)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
