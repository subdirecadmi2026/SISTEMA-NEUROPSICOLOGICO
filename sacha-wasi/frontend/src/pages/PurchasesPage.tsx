import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Product } from '../api/types'

export function PurchasesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([])
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([])
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState({ supplier_id: '', warehouse_id: '', product_id: '', quantity_ordered: '5', unit_cost: '1.00' })
  const [error, setError] = useState('')

  async function load() {
    const [p, s, l, pr] = await Promise.all([api.purchases(), api.suppliers(), api.lookups(), api.products('?type=ingredient')])
    setRows(p.data)
    setSuppliers(s as Array<{ id: string; name: string }>)
    setWarehouses(l.warehouses as Array<{ id: string; name: string }>)
    setProducts(pr.data)
    setForm((f) => ({
      ...f,
      supplier_id: f.supplier_id || (s[0] as { id: string } | undefined)?.id || '',
      warehouse_id: f.warehouse_id || l.warehouses[0]?.id || '',
      product_id: f.product_id || pr.data[0]?.id || '',
    }))
  }
  useEffect(() => { load().catch((e: Error) => setError(e.message)) }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const po = await api.createPurchase({
      supplier_id: form.supplier_id,
      warehouse_id: form.warehouse_id,
      items: [{ product_id: form.product_id, quantity_ordered: form.quantity_ordered, unit_cost: form.unit_cost }],
    }) as { id: string }
    await api.approvePurchase(po.id)
    await api.receivePurchase(po.id)
    await load()
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-clay-600">{error}</p> : null}
      <form onSubmit={onSubmit} className="grid gap-2 rounded-2xl border bg-white p-4 md:grid-cols-6 dark:border-white/10 dark:bg-forest-900">
        <select className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.quantity_ordered} onChange={(e) => setForm({ ...form, quantity_ordered: e.target.value })} />
        <input className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
        <button className="rounded-xl bg-forest-800 text-white">Crear, aprobar y recibir</button>
      </form>
      <ul className="space-y-2 text-sm">
        {rows.map((r) => <li key={String(r.id)} className="rounded-xl border bg-white p-3 dark:border-white/10 dark:bg-forest-900">{String(r.number)} · {String(r.status)} · ${Number(r.total).toFixed(2)}</li>)}
      </ul>
    </div>
  )
}
