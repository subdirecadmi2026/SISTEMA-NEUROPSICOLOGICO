import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

type Table = { id: string; name: string; code: string; seats: number; status: string; pos_x: number; pos_y: number; qr_token: string }
type Area = { id: string; name: string; tables: Table[] }

const colors: Record<string, string> = {
  free: 'bg-forest-700',
  occupied: 'bg-clay-600',
  waiting_food: 'bg-amber-700',
  paying: 'bg-forest-800',
  reserved: 'bg-copper-400 text-forest-950',
}

const statuses = [
  { value: 'free', label: 'Libre' },
  { value: 'occupied', label: 'Ocupada' },
  { value: 'waiting_food', label: 'Esperando' },
  { value: 'paying', label: 'Pagando' },
  { value: 'reserved', label: 'Reservada' },
]

export function TablesPage() {
  const [areas, setAreas] = useState<Area[]>([])
  const [error, setError] = useState('')

  async function load() {
    setAreas((await api.tables()) as Area[])
  }

  useEffect(() => {
    load().catch((e: Error) => setError(e.message))
  }, [])

  return (
    <div className="space-y-6">
      {error ? <p className="text-clay-600">{error}</p> : null}
      <div className="flex flex-wrap gap-3 text-xs">
        {statuses.map((s) => (
          <span key={s.value} className="inline-flex items-center gap-1">
            <span className={`h-3 w-3 rounded-full ${colors[s.value]}`} />
            {s.label}
          </span>
        ))}
      </div>
      {areas.map((area) => (
        <section key={area.id}>
          <h2 className="font-display text-lg text-forest-800 dark:text-cream-50">{area.name}</h2>
          <div className="relative mt-3 min-h-[380px] overflow-hidden rounded-2xl border border-cream-200 bg-[radial-gradient(circle_at_top,_rgba(45,107,82,0.12),_transparent_55%),linear-gradient(#f3ead6,#e6d7b8)] dark:border-white/10 dark:bg-forest-900">
            {area.tables.map((t) => (
              <div key={t.id} className={`absolute w-32 rounded-2xl p-3 text-white shadow-lg ${colors[t.status] ?? 'bg-forest-800'}`} style={{ left: t.pos_x, top: t.pos_y }}>
                <p className="font-display text-lg">{t.code}</p>
                <p className="text-xs opacity-90">{t.seats} pax</p>
                <select
                  className="mt-2 w-full rounded-lg border-0 bg-black/20 px-1 py-1 text-[11px]"
                  value={t.status}
                  onChange={(e) => void api.updateTableStatus(t.id, e.target.value).then(load)}
                >
                  {statuses.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <Link className="mt-1 block text-[11px] underline" to={`/m/${t.qr_token}`} target="_blank">Menú QR</Link>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
