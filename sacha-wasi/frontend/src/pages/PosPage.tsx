import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, enqueueOfflineSale, peekOfflineSales, clearOfflineSales } from '../api/client'
import type { Category, Product } from '../api/types'

type CartLine = { product: Product; qty: number }
type Share = { label: string; method: 'cash' | 'transfer'; amount: string; tendered: string; reference: string }

function money(n: number): string {
  return `$${n.toFixed(2)}`
}

function newClientUlid(): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase()
  return `SW${Date.now().toString(36).toUpperCase()}${rand}`.slice(0, 26)
}

function splitEven(total: number, people: number): string[] {
  const count = Math.max(1, people)
  const cents = Math.round(total * 100)
  const base = Math.floor(cents / count)
  const leftover = cents - base * count
  return Array.from({ length: count }, (_, index) => ((base + (index === count - 1 ? leftover : 0)) / 100).toFixed(2))
}

export function PosPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tables, setTables] = useState<Array<{ id: string; name: string; code: string }>>([])
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([])
  const [categoryId, setCategoryId] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [tableId, setTableId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [docType, setDocType] = useState('invoice')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [queued, setQueued] = useState(0)
  const [payOpen, setPayOpen] = useState(false)
  const [people, setPeople] = useState(1)
  const [shares, setShares] = useState<Share[]>([{ label: 'Persona 1', method: 'cash', amount: '0.00', tendered: '', reference: '' }])
  const [receipt, setReceipt] = useState<{ number: string; invoiceId?: string; sequential?: string; change: number; payments: Share[] } | null>(null)

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
  const paid = shares.reduce((sum, share) => sum + Number(share.amount || 0), 0)
  const remaining = Number((total - paid).toFixed(2))
  const cashChange = shares.reduce((sum, share) => {
    if (share.method !== 'cash') return sum
    const handed = Number(share.tendered || share.amount || 0)
    return sum + Math.max(0, handed - Number(share.amount || 0))
  }, 0)

  function add(product: Product) {
    setCart((current) => {
      const found = current.find((l) => l.product.id === product.id)
      if (found) return current.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l))
      return [...current, { product, qty: 1 }]
    })
  }

  function setQty(productId: string, qty: number) {
    setCart((current) => current.flatMap((line) => {
      if (line.product.id !== productId) return [line]
      if (qty <= 0) return []
      return [{ ...line, qty }]
    }))
  }

  function applySplit(count: number) {
    const n = Math.max(1, Math.min(20, count))
    setPeople(n)
    const amounts = splitEven(total, n)
    setShares(amounts.map((amount, index) => ({
      label: shares[index]?.label || `Persona ${index + 1}`,
      method: shares[index]?.method || 'cash',
      amount,
      tendered: shares[index]?.method === 'cash' ? shares[index]?.tendered || '' : '',
      reference: shares[index]?.reference || '',
    })))
  }

  function openPay() {
    setError('')
    if (cart.length === 0) {
      setError('Agregue productos al ticket.')
      return
    }
    applySplit(people)
    setPayOpen(true)
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
    if (remaining > 0.009) {
      setError(`Falta cobrar ${money(remaining)}. Divida entre las personas o ajuste los montos.`)
      return
    }
    if (remaining < -0.009) {
      setError('La suma de las partes supera el total.')
      return
    }
    for (const share of shares) {
      if (share.method === 'cash' && share.tendered && Number(share.tendered) + 0.001 < Number(share.amount)) {
        setError(`${share.label}: el efectivo recibido no cubre su parte.`)
        return
      }
    }
    setPending(true)
    const payload = {
      client_ulid: newClientUlid(),
      channel: tableId ? 'salon' : 'takeaway',
      dining_table_id: tableId || null,
      customer_id: customerId || null,
      document_type: docType,
      covers: people,
      items: cart.map((l) => ({ product_id: l.product.id, quantity: l.qty })),
      payments: shares.map((share) => ({
        method: share.method,
        amount: Number(share.amount),
        guest_label: share.label,
        tendered_amount: share.method === 'cash' && share.tendered ? Number(share.tendered) : undefined,
        reference: share.reference || undefined,
      })),
    }
    try {
      if (queued > 0) await flushQueue()
      const order = await api.quickSale(payload)
      const invoice = order.latest_fiscal_document as { id?: string; sequential?: string } | undefined
      setReceipt({
        number: String(order.number),
        invoiceId: invoice?.id,
        sequential: invoice?.sequential,
        change: cashChange,
        payments: shares,
      })
      setPayOpen(false)
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((p) => (
            <button key={p.id} type="button" onClick={() => add(p)} className="overflow-hidden rounded-2xl border border-cream-100 bg-white text-left hover:border-forest-700 dark:border-white/10 dark:bg-forest-900">
              <div className="h-32 bg-cream-100 dark:bg-forest-800">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-ink-500">Sin foto</div>
                )}
              </div>
              <div className="p-3">
                <p className="font-display text-lg">{p.name}</p>
                <p className="text-sm text-ink-500">{p.category?.name}</p>
                <p className="mt-1 text-clay-600">{money(Number(p.default_price))}</p>
              </div>
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
            <li key={line.product.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate">{line.product.name}</span>
              <span className="flex items-center gap-1">
                <button type="button" className="h-6 w-6 rounded bg-cream-100 dark:bg-forest-800" onClick={() => setQty(line.product.id, line.qty - 1)}>−</button>
                {line.qty}
                <button type="button" className="h-6 w-6 rounded bg-cream-100 dark:bg-forest-800" onClick={() => setQty(line.product.id, line.qty + 1)}>+</button>
                <span className="w-14 text-right">{money(Number(line.product.default_price) * line.qty)}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="font-display mt-4 text-3xl">{money(total)}</p>
        {error && !payOpen ? <p className="mt-3 text-sm text-clay-600">{error}</p> : null}
        {queued > 0 ? <p className="mt-2 text-xs text-ink-500">{queued} venta(s) en cola offline</p> : null}
        <button disabled={pending} onClick={openPay} className="mt-4 w-full rounded-xl bg-forest-800 py-3 text-white disabled:opacity-60">
          Cobrar
        </button>
        <p className="mt-2 text-[11px] text-ink-500">Grupo, efectivo/transferencia y vuelto. Luego se imprime la factura (simulador SRI).</p>
      </aside>

      {payOpen ? (
        <div className="fixed inset-0 z-20 grid place-items-center bg-forest-950/70 p-4">
          <div className="max-h-[90svh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-cream-50 p-5 text-ink-900 dark:bg-forest-900 dark:text-cream-50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-clay-600">Cobro</p>
                <h2 className="font-display text-2xl">Total {money(total)}</h2>
              </div>
              <button type="button" onClick={() => setPayOpen(false)} className="text-sm">Cerrar</button>
            </div>
            <label className="mt-4 block text-sm">
              ¿Cuántas personas pagan? (grupo grande, cada uno por separado)
              <input
                type="number"
                min={1}
                max={20}
                className="mt-1 w-32 rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-800"
                value={people}
                onChange={(e) => applySplit(Number(e.target.value || 1))}
              />
            </label>
            <div className="mt-4 space-y-3">
              {shares.map((share, index) => {
                const handed = Number(share.tendered || 0)
                const part = Number(share.amount || 0)
                const change = share.method === 'cash' ? Math.max(0, handed - part) : 0
                return (
                  <div key={index} className="rounded-2xl border border-cream-100 bg-white p-3 dark:border-white/10 dark:bg-forest-800">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className="rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-900" value={share.label} onChange={(e) => setShares(shares.map((s, i) => i === index ? { ...s, label: e.target.value } : s))} />
                      <select className="rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-900" value={share.method} onChange={(e) => setShares(shares.map((s, i) => i === index ? { ...s, method: e.target.value as 'cash' | 'transfer' } : s))}>
                        <option value="cash">Efectivo</option>
                        <option value="transfer">Transferencia</option>
                      </select>
                      <label className="text-sm">
                        Parte a pagar
                        <input className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-900" value={share.amount} onChange={(e) => setShares(shares.map((s, i) => i === index ? { ...s, amount: e.target.value } : s))} />
                      </label>
                      {share.method === 'cash' ? (
                        <label className="text-sm">
                          ¿Cuánto me da?
                          <input className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-900" placeholder={share.amount} value={share.tendered} onChange={(e) => setShares(shares.map((s, i) => i === index ? { ...s, tendered: e.target.value } : s))} />
                        </label>
                      ) : (
                        <label className="text-sm">
                          Referencia / banco
                          <input className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-900" value={share.reference} onChange={(e) => setShares(shares.map((s, i) => i === index ? { ...s, reference: e.target.value } : s))} />
                        </label>
                      )}
                    </div>
                    {share.method === 'cash' ? (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {[part, 10, 20, 50].filter((n, i, arr) => arr.indexOf(n) === i && n >= part).map((n) => (
                          <button key={n} type="button" className="rounded-full bg-cream-100 px-2 py-1 dark:bg-forest-900" onClick={() => setShares(shares.map((s, i) => i === index ? { ...s, tendered: n.toFixed(2) } : s))}>
                            {n === part ? 'Exacto' : money(n)}
                          </button>
                        ))}
                        <span className="ml-auto font-medium text-forest-700">Vuelto {money(change)}</span>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-sm">Cubierto {money(paid)} · falta {money(Math.max(0, remaining))} · vuelto total {money(cashChange)}</p>
            <select className="mt-2 rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-800" value={docType} onChange={(e) => setDocType(e.target.value)}>
              <option value="invoice">Factura</option>
              <option value="sales_note">Nota de venta</option>
              <option value="ticket">Ticket</option>
            </select>
            {error ? <p className="mt-2 text-sm text-clay-600">{error}</p> : null}
            <button disabled={pending} onClick={() => void pay()} className="mt-4 w-full rounded-xl bg-forest-800 py-3 text-white disabled:opacity-60">
              {pending ? 'Cobrando…' : 'Confirmar cobro y generar factura'}
            </button>
          </div>
        </div>
      ) : null}

      {receipt ? (
        <div className="fixed inset-0 z-30 grid place-items-center bg-forest-950/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 text-ink-900">
            <p className="text-xs uppercase tracking-wide text-clay-600">Venta cerrada</p>
            <h2 className="font-display text-2xl">{receipt.number}</h2>
            <p>Factura {receipt.sequential ?? '—'} · autorizada (simulador SRI)</p>
            {receipt.change > 0 ? <p className="mt-2 text-lg">Entregar vuelto <strong>{money(receipt.change)}</strong></p> : null}
            <ul className="mt-3 text-sm">
              {receipt.payments.map((p) => (
                <li key={p.label}>{p.label}: {p.method === 'cash' ? 'efectivo' : 'transferencia'} {money(Number(p.amount))}</li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              {receipt.invoiceId ? (
                <button className="flex-1 rounded-xl bg-forest-800 py-3 text-white" onClick={() => navigate(`/facturas/${receipt.invoiceId}/imprimir`)}>
                  Imprimir factura
                </button>
              ) : null}
              <button className="flex-1 rounded-xl border py-3" onClick={() => setReceipt(null)}>Listo</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
