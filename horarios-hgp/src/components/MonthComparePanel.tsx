import { useEffect, useState } from 'react'
import type { ScheduleDoc } from '../types'
import {
  compareWithPreviousMonth,
  type MonthCompareResult,
} from '../lib/monthCompare'

type Props = {
  doc: ScheduleDoc
}

/** Comparación de carga vs mes anterior del mismo servicio. */
export function MonthComparePanel({ doc }: Props) {
  const [data, setData] = useState<MonthCompareResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    void compareWithPreviousMonth(doc)
      .then((res) => {
        if (cancelled) return
        setData(res)
        if (!res) setError('No hay mes anterior guardado para este servicio')
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo comparar con el mes anterior')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [doc.id, doc.month, doc.year, doc.unitName, doc.serviceType, doc.cells, doc.staff])

  return (
    <section className="no-print mb-4 rounded-2xl border border-line bg-white/90 p-4 shadow-sm">
      <h2 className="font-display text-lg text-navy">
        Comparar con mes anterior
      </h2>
      <p className="mb-3 text-xs text-muted">
        Horas planificadas por persona vs el horario guardado del mes previo
        (mismo servicio).
      </p>

      {loading && <p className="text-sm text-muted">Comparando…</p>}
      {!loading && error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {error}
        </p>
      )}
      {!loading && data && (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-line bg-sand/40 px-3 py-2">
              <p className="text-[10px] uppercase text-muted">vs</p>
              <p className="font-semibold text-navy">{data.prevLabel}</p>
            </div>
            <div className="rounded-lg border border-line bg-sand/40 px-3 py-2">
              <p className="text-[10px] uppercase text-muted">Horas ahora</p>
              <p className="font-semibold text-navy">{data.totalHoursNow}</p>
            </div>
            <div className="rounded-lg border border-line bg-sand/40 px-3 py-2">
              <p className="text-[10px] uppercase text-muted">Horas antes</p>
              <p className="font-semibold text-navy">{data.totalHoursPrev}</p>
            </div>
            <div className="rounded-lg border border-line bg-sand/40 px-3 py-2">
              <p className="text-[10px] uppercase text-muted">Días bajos</p>
              <p className="font-semibold text-navy">
                {data.lowDaysNow} / {data.lowDaysPrev}
              </p>
            </div>
          </div>
          <div className="max-h-64 overflow-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-navy text-white">
                <tr>
                  <th className="px-2 py-1.5 text-left">Persona</th>
                  <th className="px-2 py-1.5 text-right">Ahora</th>
                  <th className="px-2 py-1.5 text-right">Antes</th>
                  <th className="px-2 py-1.5 text-right">Δ</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={`${r.fun}-${r.name}`} className="border-t border-line">
                    <td className="px-2 py-1">
                      <strong>{r.fun}</strong> {r.name}
                      {r.status === 'nuevo' && (
                        <span className="ml-1 text-[10px] text-teal">nuevo</span>
                      )}
                      {r.status === 'ausente' && (
                        <span className="ml-1 text-[10px] text-amber-800">
                          no está
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-right">{r.hoursNow}</td>
                    <td className="px-2 py-1 text-right text-muted">
                      {r.hoursPrev}
                    </td>
                    <td
                      className={`px-2 py-1 text-right font-semibold ${
                        r.delta > 0
                          ? 'text-teal'
                          : r.delta < 0
                            ? 'text-red-700'
                            : 'text-muted'
                      }`}
                    >
                      {r.delta > 0 ? `+${r.delta}` : r.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
