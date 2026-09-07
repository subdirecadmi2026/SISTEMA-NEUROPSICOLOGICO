import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { LookupUnit, Product } from '../api/types'

const types = [
  { value: 'ingredient', label: 'Insumo' },
  { value: 'simple', label: 'Simple' },
  { value: 'prepared', label: 'Preparado' },
  { value: 'combo', label: 'Combo' },
  { value: 'modifier', label: 'Extra' },
  { value: 'packaging', label: 'Empaque' },
]

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [units, setUnits] = useState<LookupUnit[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', type: 'prepared', default_price: '6.50', default_cost: '0' })

  async function load(term = search) {
    const query = term ? `?search=${encodeURIComponent(term)}` : ''
    const result = await api.products(query)
    setProducts(result.data)
  }

  useEffect(() => {
    Promise.all([load(), api.lookups().then((l) => setUnits(l.units as LookupUnit[]))]).catch((e: Error) => setError(e.message))
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const unit = units.find((u) => u.symbol === (form.type === 'ingredient' ? 'kg' : 'porcion')) || units[0]
      await api.createProduct({
        ...form,
        base_unit_id: unit.id,
        is_sellable: form.type !== 'ingredient',
        is_purchasable: form.type === 'ingredient',
      })
      setForm({ name: '', type: 'prepared', default_price: '6.50', default_cost: '0' })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <input
          placeholder="Buscar por nombre, SKU o código"
          className="w-full max-w-md rounded-xl border border-cream-100 bg-white px-3 py-2 dark:border-white/10 dark:bg-forest-900"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <button className="rounded-xl bg-forest-800 px-4 py-2 text-white" onClick={() => load()}>
          Buscar
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-cream-100 bg-white dark:border-white/10 dark:bg-forest-900">
        <table className="w-full text-left text-sm">
          <thead className="text-ink-500">
            <tr>
              <th className="px-3 py-2">Producto</th>
              <th>SKU</th>
              <th>Tipo</th>
              <th>Costo</th>
              <th>Precio</th>
              <th>Utilidad</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const cost = Number(p.default_cost)
              const price = Number(p.default_price)
              const margin = price > 0 ? ((price - cost) / price) * 100 : 0
              return (
                <tr key={p.id} className="border-t border-cream-100 dark:border-white/10">
                  <td className="px-3 py-2">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-ink-500">{p.category?.name ?? 'Sin categoría'}</div>
                  </td>
                  <td>{p.sku}</td>
                  <td className="capitalize">{p.type}</td>
                  <td>${cost.toFixed(2)}</td>
                  <td>${price.toFixed(2)}</td>
                  <td className={margin < 30 ? 'text-clay-600' : 'text-forest-700'}>{margin.toFixed(0)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-cream-100 bg-white p-4 md:grid-cols-4 dark:border-white/10 dark:bg-forest-900">
        <input className="rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-800" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <select className="rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-800" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {types.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input className="rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-800" placeholder="Precio" value={form.default_price} onChange={(e) => setForm({ ...form, default_price: e.target.value })} />
        <button className="rounded-xl bg-clay-600 py-2 text-white">Crear producto</button>
        {error ? <p className="md:col-span-4 text-sm text-clay-600">{error}</p> : null}
      </form>
    </div>
  )
}
