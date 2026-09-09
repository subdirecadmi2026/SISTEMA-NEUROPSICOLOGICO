import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Product } from '../api/types'

export function DeliveryPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ guest_name: '', delivery_address: '', product_id: '', quantity: '1' })

  async function load() {
    const [d, p] = await Promise.all([api.delivery(), api.products('?sellable=1')])
    setData(d)
    setProducts(p.data)
    setForm((f) => ({ ...f, product_id: f.product_id || p.data[0]?.id || '' }))
  }
  useEffect(() => { load().catch((e: Error) => setError(e.message)) }, [])

  if (!data) return <p>{error || 'Cargando delivery…'}</p>
  const orders = (data.orders as Array<Record<string, unknown>>) || []
  const riders = (data.riders as Array<{ id: string; name: string }>) || []
  const integrations = (data.integrations as Array<{ name: string; status: string; message: string }>) || []

  async function create(e: FormEvent) {
    e.preventDefault()
    setError('')
    const order = await api.createOrder({
      channel: 'delivery',
      guest_name: form.guest_name,
      delivery_address: form.delivery_address,
    }) as { id: string }
    await api.addOrderItem(order.id, { product_id: form.product_id, quantity: form.quantity })
    await api.sendToKitchen(order.id)
    setNotice('Pedido interno enviado a cocina.')
    setForm((f) => ({ ...f, guest_name: '', delivery_address: '' }))
    await load()
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-clay-600">{error}</p> : null}
      {notice ? <p className="text-sm text-forest-700">{notice}</p> : null}
      <div className="grid gap-3 md:grid-cols-3">
        {integrations.map((i) => (
          <div key={i.name} className="sw-card rounded-2xl p-4 text-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-clay-600">{i.status}</p>
            <p className="font-display mt-1 text-lg">{i.name}</p>
            <p className="text-ink-500">{i.message}</p>
          </div>
        ))}
      </div>
      <form onSubmit={create} className="sw-card grid gap-2 rounded-2xl p-4 md:grid-cols-5">
        <input required placeholder="Cliente" className="sw-input" value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} />
        <input required placeholder="Dirección de entrega" className="sw-input md:col-span-2" value={form.delivery_address} onChange={(e) => setForm({ ...form, delivery_address: e.target.value })} />
        <select className="sw-input" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button className="sw-btn rounded-xl">Crear pedido interno</button>
      </form>
      {orders.length === 0 ? <p className="text-sm text-ink-500">Sin pedidos de delivery interno.</p> : null}
      {orders.map((o) => (
        <div key={String(o.id)} className="sw-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
          <div>
            <p className="font-display text-lg">{String(o.number)} · {String(o.delivery_status ?? o.status)}</p>
            <p className="text-sm text-ink-500">{String(o.guest_name ?? '')} · {String(o.delivery_address ?? '')} · ${Number(o.total).toFixed(2)}</p>
          </div>
          <select
            className="sw-input w-auto"
            defaultValue={String((o.rider as { id?: string } | undefined)?.id ?? '')}
            onChange={(e) => void api.assignDelivery(String(o.id), { rider_id: e.target.value || null, delivery_status: 'assigned' }).then(load)}
          >
            <option value="">Sin rider</option>
            {riders.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}
