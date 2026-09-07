import { useEffect, useState } from 'react'
import { api } from '../api/client'

export function DeliveryPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')

  async function load() {
    setData(await api.delivery())
  }
  useEffect(() => { load().catch((e: Error) => setError(e.message)) }, [])

  if (!data) return <p>{error || 'Cargando delivery…'}</p>
  const orders = (data.orders as Array<Record<string, unknown>>) || []
  const riders = (data.riders as Array<{ id: string; name: string }>) || []
  const integrations = (data.integrations as Array<{ name: string; status: string; message: string }>) || []

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-3">
        {integrations.map((i) => (
          <div key={i.name} className="rounded-2xl border bg-white p-3 text-sm dark:border-white/10 dark:bg-forest-900">
            <p className="font-medium">{i.name}</p>
            <p className="text-ink-500">{i.message}</p>
          </div>
        ))}
      </div>
      {orders.map((o) => (
        <div key={String(o.id)} className="flex items-center justify-between rounded-2xl border bg-white p-3 dark:border-white/10 dark:bg-forest-900">
          <div>
            <p className="font-display">{String(o.number)} · {String(o.delivery_status)}</p>
            <p className="text-sm text-ink-500">{String(o.delivery_address ?? '')} · ${Number(o.total).toFixed(2)}</p>
          </div>
          <select className="rounded-xl border px-2 py-1 dark:bg-forest-800" defaultValue={String((o.rider as { id?: string } | undefined)?.id ?? '')} onChange={(e) => void api.assignDelivery(String(o.id), { rider_id: e.target.value || null, delivery_status: 'assigned' }).then(load)}>
            <option value="">Sin rider</option>
            {riders.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}
