import { useEffect, useState } from 'react'
import { api } from '../api/client'

type Ticket = {
  id: string
  name: string
  quantity: string
  notes?: string | null
  kitchen_status: string
  fired_at?: string | null
  kitchen_station?: { name: string; color?: string } | null
  order?: { number: string; table?: { name: string } | null; channel: string }
}

const columns = [
  { key: 'pending', label: 'Pendiente', next: 'preparing' },
  { key: 'preparing', label: 'En fuego', next: 'ready' },
  { key: 'ready', label: 'Listo', next: 'delivered' },
]

export function KitchenPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [error, setError] = useState('')

  async function load() {
    setTickets((await api.kitchenTickets()) as Ticket[])
  }

  useEffect(() => {
    load().catch((e: Error) => setError(e.message))
    const id = window.setInterval(() => {
      load().catch(() => undefined)
    }, 2000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="grid min-h-[calc(100svh-57px)] gap-3 bg-forest-950 p-3 text-cream-50 md:grid-cols-3">
      {error ? <p className="col-span-3 text-clay-500">{error}</p> : null}
      {columns.map((col) => (
        <section key={col.key} className="rounded-2xl bg-forest-900 p-3">
          <h2 className="font-display text-xl">{col.label}</h2>
          <div className="mt-3 space-y-3">
            {tickets.filter((t) => t.kitchen_status === col.key).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => void api.advanceKitchen(t.id, col.next).then(load)}
                className="w-full rounded-xl bg-forest-800 p-4 text-left"
              >
                <p className="text-xs uppercase text-forest-100/70">{t.order?.number} · {t.order?.table?.name ?? t.order?.channel}</p>
                <p className="font-display mt-1 text-2xl">{t.quantity}× {t.name}</p>
                {t.notes ? <p className="text-sm text-clay-500">{t.notes}</p> : null}
                <p className="mt-2 text-xs" style={{ color: t.kitchen_station?.color ?? '#e4f0ea' }}>{t.kitchen_station?.name}</p>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
