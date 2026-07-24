import type { ScheduleDoc } from '../types'
import { staffHoursRanking } from '../lib/calendar'

type Props = {
  doc: ScheduleDoc
}

/** Ranking de horas/turnos por persona del mes. */
export function StaffHoursPanel({ doc }: Props) {
  const rows = staffHoursRanking(doc)
  if (rows.length === 0) {
    return null
  }
  const maxH = Math.max(...rows.map((r) => r.hours), 1)
  const avg =
    rows.reduce((acc, r) => acc + r.hours, 0) / Math.max(rows.length, 1)

  return (
    <section className="no-print mb-4 rounded-2xl border border-line bg-white/90 p-4 shadow-sm">
      <h2 className="font-display text-lg text-navy">Horas por persona</h2>
      <p className="mb-2 text-xs text-muted">
        Compara la carga del mes (promedio {Math.round(avg)} h).
      </p>
      <div className="space-y-2">
        {rows.map((r) => {
          const high = r.hours > avg * 1.25 && avg > 0
          const low = r.hours < avg * 0.75 && avg > 0
          return (
            <div
              key={r.staffId}
              className="grid grid-cols-[1fr_auto] gap-2 text-sm"
            >
              <div>
                <div className="mb-1 flex justify-between gap-2">
                  <span>
                    <strong className="text-navy">
                      {r.fun !== 'MED' ? `${r.fun} ` : ''}
                    </strong>
                    {r.name}
                  </span>
                  <span
                    className={
                      high
                        ? 'font-semibold text-red-700'
                        : low
                          ? 'font-semibold text-amber-800'
                          : 'text-muted'
                    }
                  >
                    {r.hours} h · {r.shifts} turnos
                  </span>
                </div>
                <div className="h-2 rounded bg-sand">
                  <div
                    className={`h-2 rounded ${high ? 'bg-red-400' : low ? 'bg-amber-400' : 'bg-teal'}`}
                    style={{
                      width: `${Math.round((r.hours / maxH) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
