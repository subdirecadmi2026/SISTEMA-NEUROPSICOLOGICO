"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { formatDateTime, formatMoney } from "@/lib/currency";
import { useDemo } from "@/lib/demo-store";

export function ComprasPage() {
  const {
    purchases,
    proveedores,
    insumos,
    sucursalId,
    createPurchase,
    updatePurchaseStatus,
  } = useDemo();
  const [proveedorId, setProveedorId] = useState(proveedores[0]?.id ?? "");
  const [insumoId, setInsumoId] = useState("");
  const [cantidad, setCantidad] = useState("10");
  const [costo, setCosto] = useState("0");
  const [lines, setLines] = useState<
    Array<{ insumo_id: string; cantidad: number; costo_unit: number }>
  >([]);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const localInsumos = useMemo(
    () => insumos.filter((i) => i.sucursal_id === sucursalId),
    [insumos, sucursalId],
  );

  const scoped = purchases.filter((p) => p.sucursal_id === sucursalId);

  return (
    <AppShell
      title="Compras y proveedores"
      subtitle="Órdenes de compra, recepción de mercadería e ingreso automático al inventario."
    >
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <form
          className="rounded-3xl border border-[var(--sw-line)] bg-[var(--sw-panel)]/95 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const result = createPurchase({
              proveedor_id: proveedorId,
              lines,
              notes,
            });
            setMessage(result.message);
            if (result.ok) {
              setLines([]);
              setNotes("");
            }
          }}
        >
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Nueva orden
          </h2>

          <label className="mt-4 block text-xs text-[var(--sw-muted)]">
            Proveedor
            <select
              className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2.5 text-sm"
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
            >
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <label className="col-span-3 text-xs text-[var(--sw-muted)] md:col-span-1">
              Insumo
              <select
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-2 py-2 text-sm"
                value={insumoId}
                onChange={(e) => {
                  const id = e.target.value;
                  setInsumoId(id);
                  const insumo = localInsumos.find((i) => i.id === id);
                  if (insumo) setCosto(String(insumo.cost_unit));
                }}
              >
                <option value="">Elegir…</option>
                {localInsumos.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-[var(--sw-muted)]">
              Cant.
              <input
                type="number"
                min="0.001"
                step="0.001"
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-2 py-2 text-sm"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </label>
            <label className="text-xs text-[var(--sw-muted)]">
              Costo
              <input
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-2 py-2 text-sm"
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
              />
            </label>
          </div>

          <button
            type="button"
            className="mt-3 w-full rounded-xl border border-[var(--sw-forest)] px-3 py-2 text-sm text-[var(--sw-forest)]"
            onClick={() => {
              if (!insumoId) return;
              setLines((prev) => [
                ...prev,
                {
                  insumo_id: insumoId,
                  cantidad: Number(cantidad),
                  costo_unit: Number(costo),
                },
              ]);
              setInsumoId("");
            }}
          >
            Agregar línea
          </button>

          <ul className="mt-3 space-y-2 text-sm">
            {lines.map((line, idx) => {
              const insumo = localInsumos.find((i) => i.id === line.insumo_id);
              return (
                <li
                  key={`${line.insumo_id}-${idx}`}
                  className="flex justify-between rounded-xl bg-white/80 px-3 py-2"
                >
                  <span>
                    {insumo?.name} · {line.cantidad}
                  </span>
                  <span>{formatMoney(line.cantidad * line.costo_unit)}</span>
                </li>
              );
            })}
          </ul>

          <label className="mt-3 block text-xs text-[var(--sw-muted)]">
            Notas
            <textarea
              className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2 text-sm"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <button
            type="submit"
            className="mt-4 w-full rounded-2xl bg-[var(--sw-forest)] py-3 text-sm font-semibold text-white"
          >
            Crear y enviar orden
          </button>
          {message ? (
            <p className="mt-2 text-center text-sm text-[var(--sw-forest)]">
              {message}
            </p>
          ) : null}
        </form>

        <section className="space-y-3">
          {scoped.map((purchase) => {
            const proveedor = proveedores.find((p) => p.id === purchase.proveedor_id);
            return (
              <article
                key={purchase.id}
                className="rounded-3xl border border-[var(--sw-line)] bg-white/85 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--sw-muted)]">
                      {purchase.status} · {formatDateTime(purchase.created_at)}
                    </p>
                    <h3 className="font-[family-name:var(--font-display)] text-2xl">
                      {purchase.numero}
                    </h3>
                    <p className="text-sm text-[var(--sw-muted)]">
                      {proveedor?.name}
                    </p>
                  </div>
                  <p className="font-semibold">{formatMoney(purchase.total)}</p>
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {purchase.lines.map((line, idx) => {
                    const insumo = insumos.find((i) => i.id === line.insumo_id);
                    return (
                      <li key={`${purchase.id}-${idx}`}>
                        {insumo?.name}: {line.cantidad} ×{" "}
                        {formatMoney(line.costo_unit)}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  {purchase.status === "enviada" || purchase.status === "borrador" ? (
                    <button
                      type="button"
                      className="rounded-xl bg-[var(--sw-chili)] px-3 py-2 text-sm text-white"
                      onClick={() =>
                        updatePurchaseStatus(purchase.id, "recibida")
                      }
                    >
                      Recibir e ingresar stock
                    </button>
                  ) : null}
                  {purchase.status !== "cancelada" &&
                  purchase.status !== "recibida" ? (
                    <button
                      type="button"
                      className="rounded-xl border border-[var(--sw-line)] px-3 py-2 text-sm"
                      onClick={() =>
                        updatePurchaseStatus(purchase.id, "cancelada")
                      }
                    >
                      Cancelar
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}
