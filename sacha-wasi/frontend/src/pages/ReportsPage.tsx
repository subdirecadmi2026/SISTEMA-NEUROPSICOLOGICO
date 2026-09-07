import { useEffect, useState } from 'react'
import { api } from '../api/client'

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-cream-100 bg-white p-4 dark:border-white/10 dark:bg-forest-900">
      <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className="font-display mt-2 text-3xl">{value}</p>
    </div>
  )
}

export function ReportsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.reports().then(setData).catch((e: Error) => setError(e.message))
  }, [])

  if (error) return <p className="text-clay-600">{error}</p>
  if (!data) return <p>Calculando utilidad real…</p>

  const products = (data.by_product as Array<{ name: string; qty: string; total: string; cost: string }>) || []
  const channels = (data.by_channel as Array<{ channel: string; tickets: number; total: string }>) || []

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Ventas" value={`$${Number(data.sales_total).toFixed(2)}`} />
        <Kpi label="Costo receta" value={`$${Number(data.cost_total).toFixed(2)}`} />
        <Kpi label="Utilidad bruta" value={`$${Number(data.gross_profit).toFixed(2)}`} />
        <Kpi label="Utilidad neta" value={`$${Number(data.net_profit).toFixed(2)}`} />
      </div>
      <p className="text-sm text-ink-500">Food cost {Number(data.food_cost_percent)}% · ticket promedio ${Number(data.avg_ticket).toFixed(2)} · gastos ${Number(data.expenses).toFixed(2)}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-4 dark:border-white/10 dark:bg-forest-900">
          <h2 className="font-display text-lg">Por canal</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {channels.map((c) => <li key={c.channel}>{c.channel}: {c.tickets} tickets · ${Number(c.total).toFixed(2)}</li>)}
          </ul>
        </section>
        <section className="rounded-2xl border bg-white p-4 dark:border-white/10 dark:bg-forest-900">
          <h2 className="font-display text-lg">Platos más vendidos</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {products.map((p) => <li key={p.name}>{p.name}: {Number(p.qty).toFixed(0)} · ${Number(p.total).toFixed(2)}</li>)}
          </ul>
        </section>
      </div>
    </div>
  )
}
