import { useEffect, useMemo, useState } from 'react'
import { api, enqueueOfflineSale, peekOfflineSales, clearOfflineSales } from '../api/client'
import type { Category, Product } from '../api/types'

type CartLine = { product: Product; qty: number }

function money(n: number): string {
  return `$${n.toFixed(2)}`
}

function newClientUlid(): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase()
  return `SW${Date.now().toString(36).toUpperCase()}${rand}`.slice(0, 26)
}

export function PosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tables, setTables] = useState<Array<{ id: string; name: string; code: string }>>([])
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([])
  const [categoryId, setCategoryId] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [tableId, setTableId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [method, setMethod] = useState('cash')
  const [docType, setDocType] = useState('invoice')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)
  const [queued, setQueued] = useState(0)

  async function load() {
    const [p, l] = await Promise.all([api.products('?sellable=1'), api.lookups()])
    setProducts(p.data)
    setCategories(l.categories as Category[])
    setTables(l.tables)
    setCustomers(l.customers)
    setQueued(peekOfflineSales().length)
  }

  useEffect(() => {
    load().catch((e: Error) => setError(e.message))
  }, [])

  const visible = useMemo(
    () => products.filter((p) => !categoryId || p.category?.id === categoryId),
    [products, categoryId],
  )
  const total = cart.reduce((sum, line) => sum + Number(line.product.default_price) * line.qty, 0)

  function add(product: Product) {
    setCart((current) => {
      const found = current.find((l) => l.product.id === product.id)
      if (found) return current.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l))
      return [...current, { product, qty: 1 }]
    })
  }

  async function flushQueue() {
    const jobs = peekOfflineSales()
    for (const job of jobs) {
      await api.quickSale(job)
    }
    clearOfflineSales()
    setQueued(0)
  }

  async function pay() {
    setError('')
    setNotice('')
    if (cart.length === 0) {
      setError('Agregue productos al ticket.')
      return
    }
    setPending(true)
    const payload = {
      client_ulid: newClientUlid(),
      channel: tableId ? 'salon' : 'takeaway',
      dining_table_id: tableId || null,
      customer_id: customerId || null,
      document_type: docType,
      items: cart.map((l) => ({ product_id: l.product.id, quantity: l.qty })),
      payments: [{ method, amount: Number(total.toFixed(2)) }],
    }
    try {
      if (queued > 0) await flushQueue()
      const order = await api.quickSale(payload)
      const invoice = order.latest_fiscal_document as { sequential?: string; sri_status?: string } | undefined
      setNotice(`Venta ${String(order.number)} cobrada. Factura ${invoice?.sequential ?? ''} · ${invoice?.sri_status ?? ''}`)
      setCart([])
      await load()
    } catch (e) {
      enqueueOfflineSale(payload)
      setQueued(peekOfflineSales().length)
      setError((e instanceof Error ? e.message : 'Sin conexión') + '. Guardado en cola offline.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid min-h-[calc(100svh-57px)] lg:grid-cols-[1fr_360px]">
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          <button className={`rounded-full px-3 py-1 text-sm ${!categoryId ? 'bg-forest-800 text-white' : 'bg-white dark:bg-forest-900'}`} onClick={() => setCategoryId('')}>
            Todas
          </button>
          {categories.filter((c) => c.show_on_pos !== false).map((c) => (
            <button key={c.id} className={`rounded-full px-3 py-1 text-sm ${categoryId === c.id ? 'bg-forest-800 text-white' : 'bg-white dark:bg-forest-900'}`} onClick={() => setCategoryId(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => (
            <button key={p.id} type="button" onClick={() => add(p)} className="rounded-2xl border border-cream-100 bg-white p-4 text-left hover:border-forest-700 dark:border-white/10 dark:bg-forest-900">
              <p className="font-display text-lg">{p.name}</p>
              <p className="text-sm text-ink-500">{p.category?.name}</p>
              <p className="mt-2 text-clay-600">{money(Number(p.default_price))}</p>
            </button>
          ))}
        </div>
      </div>
      <aside className="border-l border-cream-100 bg-white p-4 dark:border-white/10 dark:bg-forest-900">
        <p className="text-xs uppercase tracking-wide text-ink-500">Ticket</p>
        <select className="mt-2 w-full rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-800" value={tableId} onChange={(e) => setTableId(e.target.value)}>
          <option value="">Mostrador / para llevar</option>
          {tables.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select className="mt-2 w-full rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-800" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">Consumidor final</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <ul className="mt-3 space-y-2 text-sm">
          {cart.length === 0 ? <li className="text-ink-500">Toque un plato para agregar.</li> : null}
          {cart.map((line) => (
            <li key={line.product.id} className="flex justify-between">
              <span>{line.qty}× {line.product.name}</span>
              <span>{money(Number(line.product.default_price) * line.qty)}</span>
            </li>
          ))}
        </ul>
        <p className="font-display mt-4 text-3xl">{money(total)}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <select className="rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-800" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
            <option value="qr">QR</option>
          </select>
          <select className="rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-800" value={docType} onChange={(e) => setDocType(e.target.value)}>
            <option value="invoice">Factura</option>
            <option value="sales_note">Nota de venta</option>
            <option value="ticket">Ticket</option>
          </select>
        </div>
        {error ? <p className="mt-3 text-sm text-clay-600">{error}</p> : null}
        {notice ? <p className="mt-3 text-sm text-forest-700">{notice}</p> : null}
        {queued > 0 ? <p className="mt-2 text-xs text-ink-500">{queued} venta(s) en cola offline</p> : null}
        <button disabled={pending} onClick={() => void pay()} className="mt-4 w-full rounded-xl bg-forest-800 py-3 text-white disabled:opacity-60">
          {pending ? 'Cobrando…' : 'Cobrar y facturar'}
        </button>
        <p className="mt-2 text-[11px] text-ink-500">SRI en ambiente de pruebas / simulador. Requiere caja abierta.</p>
      </aside>
    </div>
  )
}
