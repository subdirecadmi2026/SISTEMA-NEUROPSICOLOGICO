import type { ScheduleDoc } from '../types'
import { MONTHS_ES } from '../types'
import { coverageByDay, isWeekend, weekdayLetter } from '../lib/calendar'

type Props = {
  doc: ScheduleDoc
}

export function DistributionPanel({ doc }: Props) {
  const coverage = coverageByDay(doc)
  const min = doc.coverageRule.minStaffPerDay

  return (
    <section className="mb-4 rounded-2xl rounded-tl-none border border-line bg-white p-4 shadow-sm">
      <h2 className="font-display text-xl text-navy">
        Distribución de cobertura — {MONTHS_ES[doc.month - 1]} {doc.year}
      </h2>
      <p className="mb-3 text-sm text-muted">
        Umbral mínimo: {min} personas / {doc.coverageRule.minHoursPerDay} h por
        día. Rojo = cobertura baja.
      </p>
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
              return (
                <tr
                  key={c.day}
                  className={
                    low
                      ? 'bg-red-50'
                      : isWeekend(doc.year, doc.month, c.day)
                        ? 'bg-teal/5'
                        : ''
                  }
                >
                  <td className="border border-line px-2 py-1.5 font-semibold">
                    {c.day}
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
    </section>
  )
}
