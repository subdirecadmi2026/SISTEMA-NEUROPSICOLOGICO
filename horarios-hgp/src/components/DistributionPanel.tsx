import { useState } from 'react'
import type { ScheduleDoc } from '../types'
import { MONTHS_ES } from '../types'
import {
  assignmentsOnDay,
  coverageByDay,
  isWeekend,
  weekdayLetter,
} from '../lib/calendar'
import { shiftMeta } from '../data/templates'
import { holidayDatesInMonth } from '../lib/holidays'
import { runAllValidations } from '../lib/validation'

type Props = {
  doc: ScheduleDoc
  onPaintDay?: (day: number) => void
}

export function DistributionPanel({ doc, onPaintDay }: Props) {
  const coverage = coverageByDay(doc)
  const min = doc.coverageRule.minStaffPerDay
  const holidays = holidayDatesInMonth(doc.year, doc.month)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const alerts = runAllValidations(doc).filter(
    (a) => a.code === 'cobertura_baja' || a.code === 'horas_bajas',
  )
  const detail = selectedDay ? assignmentsOnDay(doc, selectedDay) : []

  return (
    <section className="mb-4 rounded-2xl rounded-tl-none border border-line bg-white p-4 shadow-sm">
      <h2 className="font-display text-xl text-navy">
        Distribución de cobertura — {MONTHS_ES[doc.month - 1]} {doc.year}
      </h2>
      <p className="mb-3 text-sm text-muted">
        Umbral mínimo: {min} personas / {doc.coverageRule.minHoursPerDay} h por
        día. Rojo = cobertura baja. Clic en un día para ver quién trabaja.
      </p>

      {alerts.length > 0 && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {alerts.length} alerta(s) de cobertura/horas en el mes.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-sm">
          <thead>
            <tr className="bg-navy text-white">
              <th className="border border-navy px-2 py-2 text-left">Día</th>
              <th className="border border-navy px-2 py-2">Letra</th>
              <th className="border border-navy px-2 py-2">Personal</th>
              <th className="border border-navy px-2 py-2">Horas</th>
              <th className="border border-navy px-2 py-2 text-left">Cobertura</th>
            </tr>
          </thead>
          <tbody>
            {coverage.map((c) => {
              const max = Math.max(...coverage.map((x) => x.count), 1)
              const pct = Math.round((c.count / max) * 100)
              const low = c.count < min
              const holiday = holidays.has(c.day)
              const selected = selectedDay === c.day
              return (
                <tr
                  key={c.day}
                  onClick={() =>
                    setSelectedDay((d) => (d === c.day ? null : c.day))
                  }
                  className={`cursor-pointer ${
                    selected
                      ? 'bg-navy/10 ring-1 ring-inset ring-navy/30'
                      : low
                        ? 'bg-red-50'
                        : holiday
                          ? 'bg-amber-50'
                          : isWeekend(doc.year, doc.month, c.day)
                            ? 'bg-teal/5'
                            : 'hover:bg-sand/40'
                  }`}
                >
                  <td className="border border-line px-2 py-1.5 font-semibold">
                    {c.day}
                    {holiday ? (
                      <span className="ml-1 text-[10px] font-normal text-amber-800">
                        F
                      </span>
                    ) : null}
                  </td>
                  <td className="border border-line px-2 py-1.5 text-center">
                    {weekdayLetter(doc.year, doc.month, c.day)}
                  </td>
                  <td
                    className={`border border-line px-2 py-1.5 text-center font-bold ${
                      low ? 'text-red-700' : ''
                    }`}
                  >
                    {c.count}
                  </td>
                  <td className="border border-line px-2 py-1.5 text-center">
                    {c.hours}
                  </td>
                  <td className="border border-line px-2 py-1.5">
                    <div className="h-2 rounded bg-sand">
                      <div
                        className={`h-2 rounded ${low ? 'bg-red-400' : 'bg-teal'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selectedDay !== null && (
        <div className="mt-4 rounded-xl border border-line bg-sand/30 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-navy">
              Día {selectedDay} (
              {weekdayLetter(doc.year, doc.month, selectedDay)}) —{' '}
              {detail.length} asignación(es)
            </h3>
            {onPaintDay && (
              <button
                type="button"
                onClick={() => onPaintDay(selectedDay)}
                className="rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white"
              >
                Ir a pintar este día
              </button>
            )}
          </div>
          {detail.length === 0 ? (
            <p className="text-sm text-muted">Sin claves asignadas este día.</p>
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2">
              {detail.map((a) => {
                const meta = shiftMeta(doc.serviceType, a.code)
                return (
                  <li
                    key={`${a.staffId}-${a.code}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-line bg-white px-2 py-1.5 text-sm"
                  >
                    <span>
                      <strong>{a.fun !== 'MED' ? `${a.fun} ` : ''}</strong>
                      {a.name}
                    </span>
                    <span
                      className="rounded px-2 py-0.5 text-xs font-bold"
                      style={
                        meta
                          ? { background: meta.color, color: meta.text }
                          : undefined
                      }
                    >
                      {a.code}
                      {a.hours > 0 ? ` · ${a.hours}h` : ''}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
