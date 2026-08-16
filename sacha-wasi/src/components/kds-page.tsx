"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { formatTime } from "@/lib/currency";
import { useDemo } from "@/lib/demo-store";
import type { OrderStatus } from "@/types";

const COLUMNS: { status: OrderStatus; title: string }[] = [
  { status: "recibido", title: "Recibido" },
  { status: "en_preparacion", title: "En preparación" },
  { status: "listo", title: "Listo" },
];

function elapsedMinutes(iso: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 880;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    window.setTimeout(() => void ctx.close(), 300);
  } catch {
    // ignore audio errors in restricted environments
  }
}

export function KdsPage() {
  const {
    orders,
    updateOrderStatus,
    sucursalId,
    cloudMode,
    syncStatus,
    syncFromCloud,
  } = useDemo();
  const [now, setNow] = useState(() => Date.now());
  const [flashIds, setFlashIds] = useState<string[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const primedRef = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const visible = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.sucursal_id === sucursalId &&
          ["recibido", "en_preparacion", "listo"].includes(o.status),
      ),
    [orders, sucursalId],
  );

  useEffect(() => {
    const ids = visible.map((o) => o.id);
    if (!primedRef.current) {
      seenRef.current = new Set(ids);
      primedRef.current = true;
      return;
    }
    const fresh = ids.filter((id) => !seenRef.current.has(id));
    if (fresh.length > 0) {
      beep();
      setFlashIds(fresh);
      window.setTimeout(() => setFlashIds([]), 2500);
    }
    seenRef.current = new Set(ids);
  }, [visible]);

  return (
    <AppShell
      title="KDS Cocina"
      subtitle="Estación de cocina en tiempo real. Prioriza, actualiza estados y vigila demoras."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--sw-muted)]">
          {cloudMode
            ? `Realtime cloud · ${syncStatus ?? "escuchando cambios"}`
            : "Modo demo local · refresco de reloj cada 15s"}
        </p>
        {cloudMode ? (
          <button
            type="button"
            onClick={() => void syncFromCloud()}
            className="rounded-xl bg-[var(--sw-panel)] px-3 py-1.5 text-xs font-medium"
          >
            Refrescar ahora
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const columnOrders = visible
            .filter((o) => o.status === col.status)
            .sort((a, b) => a.station_priority - b.station_priority);

          return (
            <section
              key={col.status}
              className="rounded-3xl bg-[var(--sw-panel)]/80 p-4"
            >
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
                    const mins = elapsedMinutes(order.created_at, now);
                    const late = mins > 12;
                    const isNew = flashIds.includes(order.id);
                    return (
                      <article
                        key={order.id}
                        className={`sw-lift rounded-2xl border p-4 transition ${
                          isNew ? "animate-pulse ring-2 ring-[var(--sw-leaf)]" : ""
                        } ${
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
                                void updateOrderStatus(
                                  order.id,
                                  "en_preparacion",
                                )
                              }
                            >
                              Preparar
                            </button>
                          ) : null}
                          {col.status === "en_preparacion" ? (
                            <button
                              type="button"
                              className="rounded-xl bg-[var(--sw-chili)] px-3 py-2 text-sm text-white"
                              onClick={() =>
                                void updateOrderStatus(order.id, "listo")
                              }
                            >
                              Marcar listo
                            </button>
                          ) : null}
                          {col.status === "listo" ? (
                            <button
                              type="button"
                              className="rounded-xl bg-[var(--sw-ink)] px-3 py-2 text-sm text-white"
                              onClick={() =>
                                void updateOrderStatus(order.id, "entregado")
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
