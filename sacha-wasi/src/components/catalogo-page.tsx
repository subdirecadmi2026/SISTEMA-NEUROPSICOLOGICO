"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { formatMoney } from "@/lib/currency";
import { useDemo } from "@/lib/demo-store";
import type { Product } from "@/types";

export function CatalogoPage() {
  const {
    products,
    categories,
    recetas,
    upsertProduct,
    toggleProductActive,
  } = useDemo();
  const [editing, setEditing] = useState<Product | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const blank: Product = {
    id: "prod-new",
    name: "",
    sku: "",
    price: 10,
    category_id: categories[0]?.id ?? "cat-platos",
    sucursal_id: null,
    active: true,
    prep_minutes: 10,
  };

  const form = editing ?? blank;

  return (
    <AppShell
      title="Catálogo / Menú"
      subtitle="Crea y edita productos, precios y disponibilidad por categoría."
    >
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <form
          className="rounded-3xl border border-[var(--sw-line)] bg-[var(--sw-panel)]/95 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const payload =
              editing && editing.id !== "prod-new"
                ? editing
                : {
                    ...(editing ?? blank),
                    id: `prod-${crypto.randomUUID()}`,
                  };
            const result = upsertProduct(payload);
            setMessage(result.message);
            if (result.ok) setEditing(null);
          }}
        >
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            {editing ? "Editar producto" : "Nuevo producto"}
          </h2>
          <label className="mt-4 block text-xs text-[var(--sw-muted)]">
            Nombre
            <input
              className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2.5 text-sm"
              value={form.name}
              onChange={(e) =>
                setEditing({ ...(editing ?? blank), name: e.target.value })
              }
              required
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs text-[var(--sw-muted)]">
              SKU
              <input
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2 text-sm"
                value={form.sku}
                onChange={(e) =>
                  setEditing({ ...(editing ?? blank), sku: e.target.value })
                }
                required
              />
            </label>
            <label className="text-xs text-[var(--sw-muted)]">
              Precio
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2 text-sm"
                value={form.price}
                onChange={(e) =>
                  setEditing({
                    ...(editing ?? blank),
                    price: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="text-xs text-[var(--sw-muted)]">
              Categoría
              <select
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2 text-sm"
                value={form.category_id}
                onChange={(e) =>
                  setEditing({
                    ...(editing ?? blank),
                    category_id: e.target.value,
                  })
                }
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-[var(--sw-muted)]">
              Prep (min)
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2 text-sm"
                value={form.prep_minutes}
                onChange={(e) =>
                  setEditing({
                    ...(editing ?? blank),
                    prep_minutes: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-2xl bg-[var(--sw-forest)] py-3 text-sm font-semibold text-white"
            >
              Guardar
            </button>
            {editing ? (
              <button
                type="button"
                className="rounded-2xl border border-[var(--sw-line)] px-4 py-3 text-sm"
                onClick={() => setEditing(null)}
              >
                Cancelar
              </button>
            ) : null}
          </div>
          {message ? (
            <p className="mt-2 text-center text-sm text-[var(--sw-forest)]">
              {message}
            </p>
          ) : null}
        </form>

        <div className="grid gap-4 md:grid-cols-2">
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
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="rounded-xl bg-[var(--sw-forest)] px-3 py-2 text-xs text-white"
                    onClick={() => setEditing(product)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-[var(--sw-line)] px-3 py-2 text-xs"
                    onClick={() => toggleProductActive(product.id)}
                  >
                    {product.active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
