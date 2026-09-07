import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { Category, Product } from '../api/types'

export function PublicMenuPage() {
  const { qrToken } = useParams()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [cart, setCart] = useState<Array<{ product: Product; qty: number }>>([])
  const [guest, setGuest] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!qrToken) return
    api.publicMenu(qrToken).then(setData).catch((e: Error) => setError(e.message))
  }, [qrToken])

  if (error) return <div className="p-6 text-clay-600">{error}</div>
  if (!data) return <div className="p-6">Cargando menú…</div>

  const categories = (data.categories as Category[]) || []
  const table = data.table as { name: string; code: string }
  const company = data.company as { trade_name?: string; name?: string }

  async function order() {
    if (!qrToken || cart.length === 0) return
    try {
      await api.publicOrder(qrToken, {
        guest_name: guest || 'Invitado QR',
        items: cart.map((l) => ({ product_id: l.product.id, quantity: l.qty })),
      })
      setNotice('Pedido enviado a cocina. Un mesero confirmará el cobro en mesa.')
      setCart([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar')
    }
  }

  return (
    <div className="min-h-svh bg-cream-50 p-4 text-ink-900">
      <p className="text-xs uppercase tracking-[0.2em] text-clay-600">{company?.trade_name ?? company?.name}</p>
      <h1 className="font-display text-3xl">Menú · {table?.name}</h1>
      <p className="text-sm text-ink-500">Pedido QR interno. El cobro se hace en caja, no hay pasarela externa.</p>
      <div className="mt-4 space-y-6">
        {categories.map((c) => (
          <section key={c.id}>
            <h2 className="font-display text-xl">{c.name}</h2>
            <div className="mt-2 grid gap-2">
              {(c.products ?? []).map((p) => (
                <button key={p.id} type="button" className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-left" onClick={() => setCart((cur) => {
                  const found = cur.find((l) => l.product.id === p.id)
                  if (found) return cur.map((l) => l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l)
                  return [...cur, { product: p, qty: 1 }]
                })}>
                  {p.image_url ? <img src={p.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <span className="h-14 w-14 rounded-lg bg-cream-100" />}
                  <span className="flex-1">{p.name}</span>
                  <span>${Number(p.default_price).toFixed(2)}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="sticky bottom-0 mt-6 rounded-2xl bg-forest-900 p-4 text-cream-50">
        <input className="w-full rounded-xl px-3 py-2 text-ink-900" placeholder="Su nombre" value={guest} onChange={(e) => setGuest(e.target.value)} />
        <p className="mt-2">{cart.reduce((s, l) => s + l.qty, 0)} ítems · ${cart.reduce((s, l) => s + l.qty * Number(l.product.default_price), 0).toFixed(2)}</p>
        {notice ? <p className="text-sm">{notice}</p> : null}
        <button className="mt-2 w-full rounded-xl bg-clay-600 py-3" onClick={() => void order()}>Enviar a cocina</button>
      </div>
    </div>
  )
}
