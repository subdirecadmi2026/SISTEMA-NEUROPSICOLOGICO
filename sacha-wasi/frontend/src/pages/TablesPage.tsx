import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

type Table = { id: string; name: string; code: string; seats: number; status: string; pos_x: number; pos_y: number; qr_token: string }
type Area = { id: string; name: string; tables: Table[] }

const colors: Record<string, string> = {
  free: 'bg-forest-700',
  occupied: 'bg-clay-600',
  waiting_food: 'bg-amber-600',
  paying: 'bg-sky-700',
  reserved: 'bg-violet-700',
}

export function TablesPage() {
  const [areas, setAreas] = useState<Area[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.tables().then((d) => setAreas(d as Area[])).catch((e: Error) => setError(e.message))
  }, [])

  return (
    <div className="space-y-6">
      {error ? <p className="text-clay-600">{error}</p> : null}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries({ free: 'Libre', occupied: 'Ocupada', waiting_food: 'Esperando', paying: 'Pagando', reserved: 'Reservada' }).map(([k, l]) => (
          <span key={k} className="inline-flex items-center gap-1"><span className={`h-3 w-3 rounded-full ${colors[k]}`} />{l}</span>
        ))}
      </div>
      {areas.map((area) => (
        <section key={area.id}>
          <h2 className="font-display text-lg">{area.name}</h2>
          <div className="relative mt-3 min-h-[380px] rounded-2xl border border-cream-100 bg-white dark:border-white/10 dark:bg-forest-900">
            {area.tables.map((t) => (
              <div key={t.id} className={`absolute w-28 rounded-2xl p-3 text-white ${colors[t.status] ?? 'bg-forest-800'}`} style={{ left: t.pos_x, top: t.pos_y }}>
                <p className="font-display text-lg">{t.code}</p>
                <p className="text-xs">{t.seats} pax · {t.status}</p>
                <Link className="mt-1 block text-[11px] underline" to={`/m/${t.qr_token}`} target="_blank">Menú QR</Link>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
