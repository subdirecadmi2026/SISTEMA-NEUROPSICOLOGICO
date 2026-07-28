"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { formatMoney } from "@/lib/currency";
import { useDemo } from "@/lib/demo-store";

export function DashboardPage() {
  const { orders, insumos, cash, sucursalId, products, user } = useDemo();

  const scopedOrders = orders.filter((o) => o.sucursal_id === sucursalId);
  const sales = scopedOrders.reduce((s, o) => s + o.total, 0);
  const ticket = scopedOrders.length ? sales / scopedOrders.length : 0;
  const kitchenActive = scopedOrders.filter((o) =>
    ["recibido", "en_preparacion"].includes(o.status),
  ).length;
  const critical = insumos.filter(
    (i) => i.sucursal_id === sucursalId && i.stock <= i.min_stock,
  );

  const kpis = [
    { label: "Ventas del día", value: formatMoney(sales) },
    { label: "Ticket promedio", value: formatMoney(ticket) },
    { label: "Órdenes en cocina", value: String(kitchenActive) },
    { label: "Stock crítico", value: String(critical.length) },
  ];

  const shortcuts =
    user?.role === "cocina"
      ? [{ href: "/kds", label: "Ir a KDS" }]
      : user?.role === "caja"
        ? [
            { href: "/pos", label: "Abrir POS" },
            { href: "/caja", label: "Conciliar caja" },
          ]
        : [
            { href: "/pos", label: "POS" },
            { href: "/kds", label: "KDS" },
            { href: "/recetas", label: "Recetas" },
            { href: "/reportes", label: "Reportes" },
          ];

  return (
    <AppShell
      title={`Hola, ${user?.full_name.split(" ")[0] ?? ""}`}
      subtitle="Panel operativo de Sacha Wasi. KPIs de la sucursal activa y accesos rápidos."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, idx) => (
          <div
            key={kpi.label}
            className="sw-lift rounded-3xl border border-[var(--sw-line)] bg-white/85 p-5"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--sw-muted)]">
              {kpi.label}
            </p>
            <p className="mt-3 font-[family-name:var(--font-display)] text-3xl">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-[var(--sw-line)] bg-[var(--sw-panel)]/90 p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Accesos rápidos
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {shortcuts.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded-2xl bg-[var(--sw-forest)] px-5 py-3 text-sm font-medium text-white transition hover:translate-y-[-1px]"
              >
                {s.label}
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--sw-muted)]">
              Últimas órdenes
            </h3>
            <ul className="mt-3 space-y-2">
              {scopedOrders.slice(0, 5).map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 text-sm"
                >
                  <span>
                    {order.numero} · {order.status.replaceAll("_", " ")}
                  </span>
                  <span className="font-medium">{formatMoney(order.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--sw-line)] bg-white/85 p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Alertas
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="rounded-xl border border-[var(--sw-line)] px-3 py-3">
              Caja {cash.closed_at ? "cerrada" : "abierta"} · esperado{" "}
              {formatMoney(cash.expected_cash)}
            </li>
            {critical.length === 0 ? (
              <li className="rounded-xl border border-[var(--sw-line)] px-3 py-3">
                Sin stock crítico en esta sucursal.
              </li>
            ) : (
              critical.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-[var(--sw-chili)]/30 bg-[var(--sw-chili)]/10 px-3 py-3"
                >
                  {item.name}: {item.stock} {item.unit} (mín {item.min_stock})
                </li>
              ))
            )}
            <li className="rounded-xl border border-[var(--sw-line)] px-3 py-3">
              Catálogo activo: {products.filter((p) => p.active).length} productos
            </li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
