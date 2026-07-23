import { useState } from 'react'
import type { ScheduleDoc } from '../types'
import { replaceCodeInSchedule } from '../lib/scheduleOps'
import { shiftsFor } from '../data/templates'

type Props = {
  doc: ScheduleDoc
  readOnly: boolean
  onChange: (doc: ScheduleDoc) => void
  onFlash?: (msg: string) => void
}

/** Buscar/reemplazar una clave en todo el mes. */
export function ReplaceCodePanel({
  doc,
  readOnly,
  onChange,
  onFlash,
}: Props) {
  const codes = shiftsFor(doc.serviceType).map((s) => s.code)
  const [from, setFrom] = useState(codes[0] ?? '')
  const [to, setTo] = useState(codes[1] ?? codes[0] ?? '')

  if (readOnly) return null

  return (
    <section className="no-print mb-4 rounded-2xl border border-line bg-white/90 p-4 shadow-sm">
      <h2 className="font-display text-lg text-navy">Reemplazar clave</h2>
      <p className="mb-3 text-xs text-muted">
        Cambia una clave por otra en todas las celdas del mes.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted">
          Desde
          <select
            className="mt-1 block rounded-lg border border-line px-2 py-2 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          >
            {codes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <span className="pb-2 text-muted">→</span>
        <label className="text-xs text-muted">
          Hacia
          <select
            className="mt-1 block rounded-lg border border-line px-2 py-2 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          >
            {codes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            if (from === to) {
              onFlash?.('Elija claves distintas')
              return
            }
            const next = replaceCodeInSchedule(doc, from, to)
            if (next === doc) {
              onFlash?.(`No hay celdas con ${from}`)
              return
            }
            onChange(next)
            onFlash?.(`Reemplazado ${from} → ${to}`)
          }}
          className="rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white"
        >
          Reemplazar
        </button>
      </div>
    </section>
  )
}
