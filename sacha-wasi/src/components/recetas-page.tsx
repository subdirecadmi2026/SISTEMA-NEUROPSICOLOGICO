"use client";

import { AppShell } from "@/components/app-shell";
import { formatMoney } from "@/lib/currency";
import { useDemo } from "@/lib/demo-store";

export function RecetasPage() {
  const { recetas, recetaIngredientes, products, insumos, recipeCost } = useDemo();

  return (
    <AppShell
      title="Recetas y escandallos"
      subtitle="Cada producto vincula ingredientes, costos y versión. Al vender, el inventario baja automáticamente."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {recetas.map((receta) => {
          const product = products.find((p) => p.id === receta.producto_id);
          const lines = recetaIngredientes.filter((r) => r.receta_id === receta.id);
          const cost = recipeCost(receta.id);
          const margin = (product?.price ?? 0) - cost;
          const marginPct = product?.price ? (margin / product.price) * 100 : 0;

          return (
            <article
              key={receta.id}
              className="sw-lift rounded-3xl border border-[var(--sw-line)] bg-white/85 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--sw-muted)]">
                    v{receta.version} · {product?.sku}
                  </p>
                  <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl">
                    {receta.name}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--sw-muted)]">
                    Producto: {product?.name}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--sw-forest)]/10 px-3 py-2 text-right">
                  <p className="text-xs text-[var(--sw-muted)]">Costo</p>
                  <p className="font-semibold">{formatMoney(cost)}</p>
                </div>
              </div>

              <ul className="mt-4 space-y-2 border-t border-[var(--sw-line)] pt-4">
                {lines.map((line) => {
                  const insumo = insumos.find((i) => i.id === line.insumo_id);
                  return (
                    <li
                      key={line.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>
                        {insumo?.name}{" "}
                        <span className="text-[var(--sw-muted)]">
                          ({line.cantidad} {line.unidad})
                        </span>
                      </span>
                      <span className="text-[var(--sw-muted)]">
                        {formatMoney((insumo?.cost_unit ?? 0) * line.cantidad)}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-[var(--sw-bg)] p-3">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--sw-muted)]">
                    Precio
                  </p>
                  <p className="font-semibold">{formatMoney(product?.price ?? 0)}</p>
                </div>
                <div className="rounded-xl bg-[var(--sw-bg)] p-3">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--sw-muted)]">
                    Margen
                  </p>
                  <p className="font-semibold">{formatMoney(margin)}</p>
                </div>
                <div className="rounded-xl bg-[var(--sw-bg)] p-3">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--sw-muted)]">
                    % Margen
                  </p>
                  <p className="font-semibold">{marginPct.toFixed(1)}%</p>
                </div>
              </div>
              {receta.notes ? (
                <p className="mt-3 text-xs text-[var(--sw-muted)]">{receta.notes}</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
