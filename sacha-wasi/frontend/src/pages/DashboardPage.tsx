import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { StockItem, StockMovement } from '../api/types'

type Dashboard = {
  kpis: Record<string, number>
  low_stock: StockItem[]
  expiring_lots: { id: string; lot_code: string; expires_at: string; product?: { name: string } }[]
  recent_movements: StockMovement[]
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="sw-card rounded-2xl p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-clay-600">{label}</p>
      <p className="font-display mt-2 text-3xl text-forest-800 dark:text-cream-50">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
    </div>
  )
}

export function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .dashboard()
      .then((d) => setData(d as Dashboard))
      .catch((e: Error) => setError(e.message))
  }, [])

  if (error) return <p className="text-clay-600">{error}</p>
  if (!data) return <p>Cargando salud del negocio…</p>

  const k = data.kpis
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Ventas de hoy" value={`$${Number(k.sales_today ?? 0).toFixed(2)}`} hint={`${k.tickets_today ?? 0} tickets · promedio $${Number(k.avg_ticket ?? 0).toFixed(2)}`} />
        <Kpi label="Utilidad neta hoy" value={`$${Number(k.net_profit_today ?? 0).toFixed(2)}`} hint={`Food cost ${Number(k.food_cost_percent ?? 0)}%`} />
        <Kpi label="Caja" value={k.cash_open ? `$${Number(k.cash_system ?? 0).toFixed(2)}` : 'Cerrada'} hint={k.cash_open ? 'Sesión abierta' : 'Abra caja para vender'} />
        <Kpi label="Cocina / SRI" value={String(k.kitchen_open ?? 0)} hint={`${k.sri_authorized_today ?? 0} facturas autorizadas (simulador)`} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Productos activos" value={String(k.sellable_products)} hint={`${k.products} en catálogo`} />
        <Kpi label="Valor de inventario" value={`$${Number(k.inventory_value).toFixed(2)}`} hint="Costo promedio × stock" />
        <Kpi label="Stock bajo mínimo" value={String(k.low_stock)} hint="Alertas de reposición" />
        <Kpi label="Lotes vencidos" value={String(k.expired_lots)} hint="No deben venderse" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="sw-card rounded-2xl p-4">
          <h2 className="font-display text-lg">Stock crítico</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.low_stock.length === 0 ? <li>Sin alertas de mínimo.</li> : null}
            {data.low_stock.map((row) => (
              <li key={row.id} className="flex justify-between">
                <span>{row.product?.name}</span>
                <span className="text-clay-600">
                  {Number(row.qty_on_hand).toFixed(2)} / mín {Number(row.min_qty).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="sw-card rounded-2xl p-4">
          <h2 className="font-display text-lg">Caducidad próxima</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.expiring_lots.length === 0 ? <li>Sin lotes por vencer esta semana.</li> : null}
            {data.expiring_lots.map((lot) => (
              <li key={lot.id} className="flex justify-between">
                <span>
                  {lot.product?.name} · {lot.lot_code}
                </span>
                <span>{lot.expires_at}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="sw-card rounded-2xl p-4">
        <h2 className="font-display text-lg">Últimos movimientos de kardex</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-ink-500">
              <tr>
                <th className="py-2">Cuando</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_movements.map((m) => (
                <tr key={m.id} className="border-t border-cream-100 dark:border-white/10">
                  <td className="py-2">{new Date(m.occurred_at).toLocaleString('es-EC')}</td>
                  <td>{m.product?.name}</td>
                  <td className="capitalize">{m.type.replaceAll('_', ' ')}</td>
                  <td>
                    {m.direction === 'out' ? '−' : '+'}
                    {Number(m.quantity).toFixed(3)}
                  </td>
                  <td>{Number(m.balance_after).toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
