import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { LookupUnit, Product, Recipe } from '../api/types'

export function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [units, setUnits] = useState<LookupUnit[]>([])
  const [cost, setCost] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    product_id: '',
    name: '',
    yield_quantity: '1',
    process_waste_percent: '0',
    component_product_id: '',
    unit_id: '',
    quantity: '0.2',
    waste_percent: '0',
  })

  async function load() {
    const [r, p, l] = await Promise.all([api.recipes(), api.products('?type=prepared'), api.lookups()])
    setRecipes(r)
    const ingredients = await api.products('?type=ingredient')
    setProducts([...(p.data || []), ...(ingredients.data || [])])
    setUnits(l.units as LookupUnit[])
  }

  useEffect(() => {
    load().catch((e: Error) => setError(e.message))
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      await api.createRecipe({
        product_id: form.product_id,
        yield_unit_id: units.find((u) => u.symbol === 'porcion')?.id || units[0]?.id,
        name: form.name,
        yield_quantity: form.yield_quantity,
        process_waste_percent: form.process_waste_percent,
        is_active: true,
        items: [
          {
            component_product_id: form.component_product_id,
            unit_id: form.unit_id || units[0]?.id,
            quantity: form.quantity,
            waste_percent: form.waste_percent,
          },
        ],
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <div className="space-y-4">
        {recipes.map((recipe) => (
          <article key={recipe.id} className="sw-card rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-clay-600">v{recipe.version}</p>
                <h2 className="font-display text-xl">{recipe.product?.name ?? recipe.name}</h2>
                <p className="text-sm text-ink-500">
                  Rinde {recipe.yield_quantity} {recipe.yield_unit?.symbol} · merma proceso {recipe.process_waste_percent}%
                </p>
              </div>
              <button
                className="rounded-full border px-3 py-1 text-xs"
                onClick={() => recipe.product && api.productCost(recipe.product.id).then(setCost).catch((e: Error) => setError(e.message))}
              >
                Ver costeo
              </button>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {recipe.items.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>{item.component?.name}</span>
                  <span>
                    {item.quantity} {item.unit?.symbol} · merma {item.waste_percent}%
                  </span>
                </li>
              ))}
            </ul>
            {recipe.cached_unit_cost ? (
              <p className="mt-3 text-sm">
                Costo unitario cacheado: <strong>${Number(recipe.cached_unit_cost).toFixed(4)}</strong>
              </p>
            ) : null}
          </article>
        ))}
      </div>
      <div className="space-y-4">
        {cost ? (
          <section className="rounded-2xl bg-forest-950 p-4 text-cream-50 ring-1 ring-copper-400/30">
            <h3 className="font-display text-lg">Costeo</h3>
            <p>Costo: ${Number(cost.unit_cost).toFixed(4)}</p>
            <p>Precio: ${Number(cost.sale_price).toFixed(2)}</p>
            <p>Margen: {Number(cost.margin_percent).toFixed(1)}%</p>
          </section>
        ) : null}
        <form onSubmit={onSubmit} className="sw-card space-y-3 rounded-2xl p-4">
          <h3 className="font-display text-lg">Nueva receta</h3>
          <select className="w-full rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-800" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
            <option value="">Plato preparado</option>
            {products.filter((p) => p.type === 'prepared').map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input className="w-full rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-800" placeholder="Nombre de receta" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select className="w-full rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-800" value={form.component_product_id} onChange={(e) => setForm({ ...form, component_product_id: e.target.value })} required>
            <option value="">Insumo o sub-receta</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input className="rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-800" placeholder="Cantidad" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <select className="rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-800" value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value })}>
              <option value="">Unidad</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.symbol}</option>
              ))}
            </select>
          </div>
          {error ? <p className="text-sm text-clay-600">{error}</p> : null}
          <button className="w-full rounded-xl bg-forest-800 py-2 text-white">Guardar receta</button>
        </form>
      </div>
    </div>
  )
}
