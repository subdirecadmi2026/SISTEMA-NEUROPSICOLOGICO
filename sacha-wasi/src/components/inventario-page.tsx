"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { formatDateTime, formatMoney } from "@/lib/currency";
import { useDemo } from "@/lib/demo-store";
import type { MovementType } from "@/types";

export function InventarioPage() {
  const { insumos, movements, adjustInventory, sucursalId } = useDemo();
  const [selectedId, setSelectedId] = useState(insumos[0]?.id ?? "");
  const [tipo, setTipo] = useState<MovementType>("entrada");
  const [cantidad, setCantidad] = useState("1");
  const [motivo, setMotivo] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const localInsumos = useMemo(
    () => insumos.filter((i) => i.sucursal_id === sucursalId),
    [insumos, sucursalId],
  );

  const critical = localInsumos.filter((i) => i.stock <= i.min_stock);

  return (
    <AppShell
      title="Inventario"
      subtitle="Entradas, salidas, mermas y alertas de stock bajo por sucursal."
    >
      {critical.length > 0 ? (
        <div className="mb-4 rounded-2xl border border-[var(--sw-chili)]/40 bg-[var(--sw-chili)]/10 px-4 py-3 text-sm">
          Stock crítico: {critical.map((i) => i.name).join(", ")}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="overflow-hidden rounded-3xl border border-[var(--sw-line)] bg-white/85">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--sw-forest)] text-white">
              <tr>
                <th className="px-4 py-3 font-medium">Insumo</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Mín.</th>
                <th className="px-4 py-3 font-medium">Costo</th>
                <th className="px-4 py-3 font-medium">Lote</th>
              </tr>
            </thead>
            <tbody>
              {localInsumos.map((insumo) => {
                const low = insumo.stock <= insumo.min_stock;
                return (
                  <tr
                    key={insumo.id}
                    className={`border-t border-[var(--sw-line)] ${
                      low ? "bg-[var(--sw-chili)]/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{insumo.name}</p>
                      <p className="text-xs text-[var(--sw-muted)]">{insumo.sku}</p>
                    </td>
                    <td className="px-4 py-3">
                      {insumo.stock} {insumo.unit}
                    </td>
                    <td className="px-4 py-3">
                      {insumo.min_stock} {insumo.unit}
                    </td>
                    <td className="px-4 py-3">{formatMoney(insumo.cost_unit)}</td>
                    <td className="px-4 py-3 text-xs text-[var(--sw-muted)]">
                      {insumo.lot ?? "—"}
                      {insumo.expiry_date ? (
                        <span className="block">Cad: {insumo.expiry_date}</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <aside className="space-y-4">
          <form
            className="rounded-3xl border border-[var(--sw-line)] bg-[var(--sw-panel)]/95 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              const result = adjustInventory(
                selectedId,
                tipo,
                Number(cantidad),
                motivo || "Ajuste manual",
              );
              setMessage(result.message);
              if (result.ok) {
                setCantidad("1");
                setMotivo("");
              }
            }}
          >
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              Movimiento
            </h2>
            <label className="mt-4 block text-xs text-[var(--sw-muted)]">
              Insumo
              <select
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2.5 text-sm"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {localInsumos.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-xs text-[var(--sw-muted)]">
              Tipo
              <select
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2.5 text-sm"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as MovementType)}
              >
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
                <option value="merma">Merma</option>
                <option value="ajuste">Ajuste (+/−)</option>
              </select>
            </label>
            <label className="mt-3 block text-xs text-[var(--sw-muted)]">
              Cantidad
              <input
                type="number"
                min="0.001"
                step="0.001"
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2.5 text-sm"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </label>
            <label className="mt-3 block text-xs text-[var(--sw-muted)]">
              Motivo
              <input
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2.5 text-sm"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Compra, merma, conteo…"
              />
            </label>
            <button
              type="submit"
              className="mt-4 w-full rounded-2xl bg-[var(--sw-forest)] py-3 text-sm font-semibold text-white"
            >
              Registrar
            </button>
            {message ? (
              <p className="mt-2 text-center text-sm text-[var(--sw-forest)]">
                {message}
              </p>
            ) : null}
          </form>

          <div className="rounded-3xl border border-[var(--sw-line)] bg-white/85 p-5">
            <h3 className="font-[family-name:var(--font-display)] text-xl">
              Últimos movimientos
            </h3>
            <ul className="mt-3 max-h-72 space-y-2 overflow-auto text-sm">
              {movements.slice(0, 12).map((mov) => {
                const insumo = insumos.find((i) => i.id === mov.insumo_id);
                return (
                  <li
                    key={mov.id}
                    className="rounded-xl border border-[var(--sw-line)] px-3 py-2"
                  >
                    <p className="font-medium">
                      {mov.tipo} · {insumo?.name} · {mov.cantidad}
                    </p>
                    <p className="text-xs text-[var(--sw-muted)]">
                      {mov.motivo} · {formatDateTime(mov.created_at)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
