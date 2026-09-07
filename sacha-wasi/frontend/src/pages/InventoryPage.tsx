import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Product, StockItem, StockMovement, Warehouse } from '../api/types'

export function InventoryPage() {
  const [stock, setStock] = useState<StockItem[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({ warehouse_id: '', product_id: '', quantity: '5', unit_cost: '1.20', lot_code: 'LOTE-DEMO', expires_at: '2026-10-30' })

  async function load() {
    const [s, k, l, p] = await Promise.all([api.stock(), api.kardex(), api.lookups(), api.products('?type=ingredient')])
    setStock(s)
    setMovements(k.data)
    setWarehouses(l.warehouses as Warehouse[])
    setProducts(p.data)
    setForm((f) => ({ ...f, warehouse_id: f.warehouse_id || l.warehouses[0]?.id || '', product_id: f.product_id || p.data[0]?.id || '' }))
  }

  useEffect(() => {
    load().catch((e: Error) => setError(e.message))
  }, [])

  async function receive(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      await api.receive(form)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={receive} className="grid gap-2 rounded-2xl border border-cream-100 bg-white p-4 md:grid-cols-6 dark:border-white/10 dark:bg-forest-900">
        <select className="rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-800" value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <select className="rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-800" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input className="rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-800" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Cantidad" />
        <input className="rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-800" value={form.lot_code} onChange={(e) => setForm({ ...form, lot_code: e.target.value })} placeholder="Lote" />
        <input className="rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-800" type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
        <button className="rounded-xl bg-forest-800 text-white">Ingresar</button>
        {error ? <p className="md:col-span-6 text-sm text-clay-600">{error}</p> : null}
      </form>
      <section className="overflow-x-auto rounded-2xl border border-cream-100 bg-white dark:border-white/10 dark:bg-forest-900">
        <h2 className="font-display px-4 pt-4 text-lg">Stock por bodega</h2>
        <table className="mt-2 w-full text-left text-sm">
          <thead className="text-ink-500">
            <tr>
              <th className="px-4 py-2">Producto</th>
              <th>Bodega</th>
              <th>On hand</th>
              <th>Mínimo</th>
              <th>Costo prom.</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((row) => (
              <tr key={row.id} className="border-t border-cream-100 dark:border-white/10">
                <td className="px-4 py-2">{row.product?.name}</td>
                <td>{row.warehouse?.name}</td>
                <td className={Number(row.qty_on_hand) <= Number(row.min_qty) ? 'text-clay-600' : ''}>{Number(row.qty_on_hand).toFixed(3)}</td>
                <td>{Number(row.min_qty).toFixed(3)}</td>
                <td>${Number(row.avg_cost).toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="overflow-x-auto rounded-2xl border border-cream-100 bg-white dark:border-white/10 dark:bg-forest-900">
        <h2 className="font-display px-4 pt-4 text-lg">Kardex</h2>
        <table className="mt-2 w-full text-left text-sm">
          <thead className="text-ink-500">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th>Producto</th>
              <th>Movimiento</th>
              <th>Lote</th>
              <th>Cantidad</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id} className="border-t border-cream-100 dark:border-white/10">
                <td className="px-4 py-2">{new Date(m.occurred_at).toLocaleString('es-EC')}</td>
                <td>{m.product?.name}</td>
                <td>{m.type}</td>
                <td>{m.lot?.lot_code ?? '—'}</td>
                <td>
                  {m.direction === 'out' ? '−' : '+'}
                  {Number(m.quantity).toFixed(3)}
                </td>
                <td>{Number(m.balance_after).toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
