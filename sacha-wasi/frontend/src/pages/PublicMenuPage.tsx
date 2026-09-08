import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check, Clock, Leaf, Minus, Plus } from 'lucide-react'
import { api } from '../api/client'

type MenuProduct = {
  id: string
  name: string
  description?: string | null
  default_price: string
  image_url?: string | null
  prep_time_minutes?: number | null
  allergens?: string[] | null
}

type MenuCategory = {
  id: string
  name: string
  color?: string | null
  products: MenuProduct[]
}

type MenuPayload = {
  table?: { name: string; code: string; seats?: number }
  branch?: { name?: string; city?: string; address?: string }
  company?: { trade_name?: string; name?: string }
  categories?: MenuCategory[]
}

type CartLine = { product: MenuProduct; qty: number }

const HERO =
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=80'

function money(n: number): string {
  return `$${n.toFixed(2)}`
}

export function PublicMenuPage() {
  const { qrToken } = useParams()
  const [data, setData] = useState<MenuPayload | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [guest, setGuest] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [activeCategory, setActiveCategory] = useState('')
  const [trayOpen, setTrayOpen] = useState(false)

  useEffect(() => {
    if (!qrToken) return
    api.publicMenu(qrToken).then((raw) => {
      const menu = raw as MenuPayload
      setData(menu)
      setActiveCategory(menu.categories?.[0]?.id ?? '')
    }).catch((e: Error) => setError(e.message))
  }, [qrToken])

  const categories = data?.categories ?? []
  const table = data?.table
  const companyName = data?.company?.trade_name ?? data?.company?.name ?? 'Sacha Wasi'
  const city = data?.branch?.city ?? 'Quito'

  useEffect(() => {
    if (!data) return
    document.title = `Carta · ${companyName}`
  }, [data, companyName])

  const items = cart.reduce((sum, line) => sum + line.qty, 0)
  const total = cart.reduce((sum, line) => sum + line.qty * Number(line.product.default_price), 0)

  useEffect(() => {
    if (items === 0) setTrayOpen(false)
  }, [items])

  const qtyOf = useMemo(() => {
    const map = new Map<string, number>()
    for (const line of cart) map.set(line.product.id, line.qty)
    return map
  }, [cart])

  function setQty(product: MenuProduct, qty: number) {
    setCart((current) => {
      const rest = current.filter((line) => line.product.id !== product.id)
      if (qty <= 0) return rest
      return [...rest, { product, qty }]
    })
  }

  function scrollTo(id: string) {
    setActiveCategory(id)
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function order() {
    if (!qrToken || cart.length === 0) return
    setError('')
    setPending(true)
    try {
      await api.publicOrder(qrToken, {
        guest_name: guest.trim() || `Mesa ${table?.code ?? ''}`.trim(),
        notes: notes.trim() || undefined,
        items: cart.map((line) => ({ product_id: line.product.id, quantity: line.qty })),
      })
      setSent(true)
      setCart([])
      setNotes('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar el pedido')
    } finally {
      setPending(false)
    }
  }

  if (error && !data) {
    return (
      <div className="grid min-h-svh place-items-center bg-forest-950 px-6 text-center text-cream-50">
        <div>
          <Leaf className="mx-auto mb-4 h-8 w-8 text-clay-500" />
          <p className="font-display text-2xl">No encontramos esta mesa</p>
          <p className="mt-2 text-sm text-forest-100">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-svh bg-[#f4efe4]">
        <div className="h-64 animate-pulse bg-forest-900" />
        <div className="mx-auto max-w-6xl space-y-4 p-5">
          <div className="h-8 w-40 animate-pulse rounded bg-cream-100" />
          <div className="grid grid-cols-4 gap-3">
            <div className="h-56 animate-pulse rounded-3xl bg-cream-100" />
            <div className="h-56 animate-pulse rounded-3xl bg-cream-100" />
            <div className="h-56 animate-pulse rounded-3xl bg-cream-100" />
            <div className="h-56 animate-pulse rounded-3xl bg-cream-100" />
          </div>
        </div>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="grid min-h-svh place-items-center bg-forest-950 px-6 text-center text-cream-50">
        <div className="max-w-sm">
          <Leaf className="mx-auto mb-4 h-6 w-6 text-clay-500" />
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-forest-700">
            <Check className="h-8 w-8" />
          </div>
          <p className="mt-6 text-xs uppercase tracking-[0.28em] text-clay-500">Pedido en cocina</p>
          <h1 className="font-display mt-2 text-4xl">Ya lo preparamos</h1>
          <p className="mt-3 text-forest-100">
            {guest.trim() ? `${guest.trim()}, su` : 'Su'} pedido de {table?.name ?? 'mesa'} ya está en fogón.
            Un mesero confirmará el cobro en mesa.
          </p>
          <button
            type="button"
            className="mt-8 w-full rounded-full bg-cream-50 py-3 font-medium text-forest-950"
            onClick={() => setSent(false)}
          >
            Seguir viendo la carta
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-[#f4efe4] text-ink-900">
      <header className="relative isolate overflow-hidden text-cream-50">
        <img src={HERO} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/70 to-forest-900/30" />
        <div className="relative mx-auto max-w-6xl px-5 pb-8 pt-10">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] backdrop-blur">
              <Leaf className="h-3.5 w-3.5 text-clay-500" />
              {city} · Ecuador
            </span>
            <span className="rounded-full border border-white/20 px-3 py-1 text-xs">
              {table?.name} · {table?.seats ?? '—'} pax
            </span>
          </div>
          <h1 className="font-display mt-8 text-5xl leading-none">{companyName}</h1>
          <p className="mt-3 max-w-sm text-sm text-cream-100/85">
            Carta digital de mesa. Elija a su ritmo; el cobro se hace con el mesero, sin pasarela.
          </p>
        </div>
      </header>

      <nav className="sticky top-0 z-10 border-b border-cream-100/80 bg-[#f4efe4]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-5 py-3">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => scrollTo(category.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition ${
                activeCategory === category.id
                  ? 'bg-forest-800 text-white'
                  : 'bg-white text-ink-700 shadow-sm'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </nav>

      <main className={`mx-auto max-w-6xl space-y-10 px-5 py-6 ${items > 0 ? 'pb-28' : 'pb-10'}`}>
        {categories.map((category) => (
          <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-16">
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-2xl">{category.name}</h2>
              <span className="mx-4 mb-2 h-px flex-1 bg-forest-800/20" />
            </div>
            <div className="grid grid-cols-4 gap-3 md:gap-4">
              {category.products.map((product) => {
                const qty = qtyOf.get(product.id) ?? 0
                return (
                  <article key={product.id} className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[0_12px_40px_rgba(18,33,27,0.08)]">
                    <div className="relative h-36 bg-cream-100 md:h-40">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : null}
                      <span className="absolute bottom-2 right-2 rounded-full bg-cream-50/95 px-2.5 py-0.5 font-display text-base text-forest-900 shadow-sm">
                        {money(Number(product.default_price))}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      <h3 className="font-display text-lg leading-tight">{product.name}</h3>
                      {product.description ? (
                        <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-ink-500">{product.description}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-500">
                        {product.prep_time_minutes ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-cream-50 px-2 py-0.5">
                            <Clock className="h-3 w-3" />
                            {product.prep_time_minutes} min
                          </span>
                        ) : null}
                        {(product.allergens ?? []).map((allergen) => (
                          <span key={allergen} className="rounded-full bg-cream-50 px-2 py-0.5">
                            {allergen}
                          </span>
                        ))}
                      </div>
                      <div className="mt-auto flex items-center justify-end pt-3">
                        {qty === 0 ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full bg-forest-800 px-3 py-1.5 text-sm text-white"
                            onClick={() => setQty(product, 1)}
                          >
                            <Plus className="h-4 w-4" />
                            Agregar
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-2 rounded-full bg-cream-50 px-1.5 py-1">
                            <button type="button" className="grid h-7 w-7 place-items-center rounded-full bg-white" onClick={() => setQty(product, qty - 1)} aria-label="Quitar">
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-4 text-center text-sm font-medium">{qty}</span>
                            <button type="button" className="grid h-7 w-7 place-items-center rounded-full bg-forest-800 text-white" onClick={() => setQty(product, qty + 1)} aria-label="Agregar">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </main>

      {items > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-20 p-4">
          <div className="mx-auto max-w-lg overflow-hidden rounded-3xl bg-forest-950 text-cream-50 shadow-[0_-12px_40px_rgba(11,22,18,0.35)]">
            {trayOpen ? (
              <div className="p-4">
                <div className="mb-3 flex items-baseline justify-between">
                  <button type="button" className="text-xs uppercase tracking-[0.2em] text-clay-500" onClick={() => setTrayOpen(false)}>
                    Cerrar
                  </button>
                  <p className="font-display text-2xl">{money(total)}</p>
                </div>
                <ul className="mb-3 max-h-24 space-y-1 overflow-y-auto text-sm text-cream-100/90">
                  {cart.map((line) => (
                    <li key={line.product.id} className="flex justify-between gap-3">
                      <span>{line.qty} × {line.product.name}</span>
                      <span>{money(line.qty * Number(line.product.default_price))}</span>
                    </li>
                  ))}
                </ul>
                <input
                  className="w-full rounded-2xl border-0 bg-white px-3 py-2.5 text-sm text-ink-900"
                  placeholder="¿Cómo le llamamos en mesa?"
                  value={guest}
                  onChange={(e) => setGuest(e.target.value)}
                />
                <input
                  className="mt-2 w-full rounded-2xl border-0 bg-white/90 px-3 py-2.5 text-sm text-ink-900"
                  placeholder="Indicación para cocina (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                {error ? <p className="mt-2 text-sm text-clay-500">{error}</p> : null}
                <button
                  type="button"
                  disabled={pending}
                  className="mt-3 w-full rounded-2xl bg-clay-600 py-3.5 font-medium text-white disabled:opacity-60"
                  onClick={() => void order()}
                >
                  {pending ? 'Enviando a cocina…' : 'Enviar pedido a cocina'}
                </button>
                <p className="mt-2 text-center text-[11px] text-forest-100/70">El mesero cobra en mesa · simulador interno</p>
              </div>
            ) : (
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                onClick={() => setTrayOpen(true)}
              >
                <span>
                  <span className="block text-[11px] uppercase tracking-[0.2em] text-clay-500">Su pedido</span>
                  <span className="text-sm">{items} {items === 1 ? 'plato' : 'platos'}</span>
                </span>
                <span className="rounded-full bg-clay-600 px-4 py-2 text-sm font-medium">{money(total)} · Pedir</span>
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
