"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { formatTime } from "@/lib/currency";
import { useDemo } from "@/lib/demo-store";
import type { OrderStatus } from "@/types";

const COLUMNS: { status: OrderStatus; title: string }[] = [
  { status: "recibido", title: "Recibido" },
  { status: "en_preparacion", title: "En preparación" },
  { status: "listo", title: "Listo" },
];

function elapsedMinutes(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

export function KdsPage() {
  const { orders, updateOrderStatus, sucursalId } = useDemo();

  const visible = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.sucursal_id === sucursalId &&
          ["recibido", "en_preparacion", "listo"].includes(o.status),
      ),
    [orders, sucursalId],
  );

  return (
    <AppShell
      title="KDS Cocina"
      subtitle="Estación de cocina en tiempo real. Prioriza, actualiza estados y vigila demoras."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const columnOrders = visible
            .filter((o) => o.status === col.status)
            .sort((a, b) => a.station_priority - b.station_priority);

          return (
            <section key={col.status} className="rounded-3xl bg-[var(--sw-panel)]/80 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-[family-name:var(--font-display)] text-2xl">
                  {col.title}
                </h2>
                <span className="rounded-full bg-[var(--sw-forest)]/10 px-3 py-1 text-sm">
                  {columnOrders.length}
                </span>
              </div>
              <div className="space-y-3">
                {columnOrders.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[var(--sw-muted)]">
                    Sin órdenes
                  </p>
                ) : (
                  columnOrders.map((order) => {
                    const mins = elapsedMinutes(order.created_at);
                    const late = mins > 12;
                    return (
                      <article
                        key={order.id}
                        className={`sw-lift rounded-2xl border p-4 ${
                          late
                            ? "border-[var(--sw-chili)] bg-[var(--sw-chili)]/10"
                            : "border-[var(--sw-line)] bg-white/85"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-[family-name:var(--font-display)] text-xl">
                              {order.numero}
                            </p>
                            <p className="text-xs uppercase tracking-wide text-[var(--sw-muted)]">
                              {order.channel} · {formatTime(order.created_at)}
                            </p>
                          </div>
                          <span
                            className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                              late
                                ? "bg-[var(--sw-chili)] text-white"
                                : "bg-[var(--sw-leaf)]/30"
                            }`}
                          >
                            {mins} min
                          </span>
                        </div>
                        <ul className="mt-3 space-y-2">
                          {order.items.map((item) => (
                            <li key={item.id} className="text-sm">
                              <span className="font-semibold">{item.qty}×</span>{" "}
                              {item.producto_name}
                              {item.notes ? (
                                <span className="block text-xs text-[var(--sw-muted)]">
                                  {item.notes}
                                </span>
                              ) : null}
                              {item.modifiers.length > 0 ? (
                                <span className="block text-xs text-[var(--sw-chili)]">
                                  {item.modifiers.join(", ")}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {col.status === "recibido" ? (
                            <button
                              type="button"
                              className="rounded-xl bg-[var(--sw-forest)] px-3 py-2 text-sm text-white"
                              onClick={() =>
                                updateOrderStatus(order.id, "en_preparacion")
                              }
                            >
                              Preparar
                            </button>
                          ) : null}
                          {col.status === "en_preparacion" ? (
                            <button
                              type="button"
                              className="rounded-xl bg-[var(--sw-chili)] px-3 py-2 text-sm text-white"
                              onClick={() => updateOrderStatus(order.id, "listo")}
                            >
                              Marcar listo
                            </button>
                          ) : null}
                          {col.status === "listo" ? (
                            <button
                              type="button"
                              className="rounded-xl bg-[var(--sw-ink)] px-3 py-2 text-sm text-white"
                              onClick={() =>
                                updateOrderStatus(order.id, "entregado")
                              }
                            >
                              Entregar
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
