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

  return (
    <section className="no-print mb-4 rounded-2xl border border-line bg-white/90 p-4 shadow-sm">
      <h2 className="font-display text-lg text-navy">Horas por persona</h2>
      <p className="mb-3 text-xs text-muted">
        Compara la carga del mes (horas planificadas y turnos productivos).
      </p>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.staffId} className="grid grid-cols-[1fr_auto] gap-2 text-sm">
            <div>
              <div className="mb-1 flex justify-between gap-2">
                <span>
                  <strong className="text-navy">{r.fun}</strong> {r.name}
                </span>
                <span className="text-muted">
                  {r.hours} h · {r.shifts} turnos
                </span>
              </div>
              <div className="h-2 rounded bg-sand">
                <div
                  className="h-2 rounded bg-teal"
                  style={{ width: `${Math.round((r.hours / maxH) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
