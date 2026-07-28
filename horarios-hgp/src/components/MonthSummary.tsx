import type { ScheduleDoc } from '../types'
import {
  coverageByDay,
  daysInMonth,
  plannedHours,
} from '../lib/calendar'
import { holidayDatesInMonth } from '../lib/holidays'

type Props = {
  doc: ScheduleDoc
}

/** Barra compacta de KPIs del mes en elaboración. */
export function MonthSummary({ doc }: Props) {
  const named = doc.staff.filter((s) => s.name.trim()).length
  const days = daysInMonth(doc.year, doc.month)
  const holidays = holidayDatesInMonth(doc.year, doc.month).size
  const totalHours = doc.staff.reduce(
    (acc, s) => acc + (s.name.trim() ? plannedHours(doc, s.id) : 0),
    0,
  )
  const filled = Object.keys(doc.cells).length
  const capacity = Math.max(named * days, 1)
  const fillPct = Math.min(100, Math.round((filled / capacity) * 100))
  const cov = coverageByDay(doc)
  const lowDays = cov.filter(
    (c) => c.count < doc.coverageRule.minStaffPerDay,
  ).length

  const items = [
    { label: 'Personal', value: String(named) },
    { label: 'Horas plan.', value: String(totalHours) },
    { label: 'Celdas', value: `${fillPct}%` },
    { label: 'Feriados', value: String(holidays) },
    { label: 'Días bajos', value: String(lowDays) },
  ]

  return (
    <section className="no-print mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-xl border border-line bg-white/90 px-3 py-2 shadow-sm"
        >
          <p className="text-[10px] uppercase tracking-wider text-muted">
            {it.label}
          </p>
          <p className="font-display text-xl text-navy">{it.value}</p>
        </div>
      ))}
    </section>
  )
}
