"use client";

import { AppShell } from "@/components/app-shell";
import { formatMoney } from "@/lib/currency";
import { useDemo } from "@/lib/demo-store";

export function CatalogoPage() {
  const { products, categories, recetas } = useDemo();

  return (
    <AppShell
      title="Catálogo / Menú"
      subtitle="Productos, precios y disponibilidad. Las recetas activas alimentan el POS y el inventario."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => {
          const category = categories.find((c) => c.id === product.category_id);
          const hasRecipe = recetas.some(
            (r) => r.producto_id === product.id && r.active,
          );
          return (
            <article
              key={product.id}
              className="sw-lift rounded-3xl border border-[var(--sw-line)] bg-white/85 p-5"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--sw-muted)]">
                {category?.name} · {product.sku}
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl">
                {product.name}
              </h2>
              <p className="mt-3 text-xl font-semibold text-[var(--sw-forest)]">
                {formatMoney(product.price)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg bg-[var(--sw-bg)] px-2 py-1">
                  Prep {product.prep_minutes} min
                </span>
                <span
                  className={`rounded-lg px-2 py-1 ${
                    hasRecipe
                      ? "bg-[var(--sw-leaf)]/30"
                      : "bg-[var(--sw-chili)]/15"
                  }`}
                >
                  {hasRecipe ? "Con receta" : "Sin receta"}
                </span>
                <span className="rounded-lg bg-[var(--sw-bg)] px-2 py-1">
                  {product.active ? "Activo" : "Inactivo"}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
