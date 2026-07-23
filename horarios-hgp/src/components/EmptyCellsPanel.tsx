import type { ScheduleDoc } from '../types'
import {
  emptyCellsReport,
  fillStaffEmptyDays,
} from '../lib/scheduleOps'

type Props = {
  doc: ScheduleDoc
  readOnly: boolean
  activeCode: string
  onChange: (doc: ScheduleDoc) => void
  onFlash?: (msg: string) => void
}

/** Lista personal con días sin clave y acciones rápidas. */
export function EmptyCellsPanel({
  doc,
  readOnly,
  activeCode,
  onChange,
  onFlash,
}: Props) {
  const rows = emptyCellsReport(doc)
  if (rows.length === 0) {
    const named = doc.staff.some((s) => s.name.trim())
    if (!named) return null
    return (
      <section className="no-print mb-4 rounded-2xl border border-teal/30 bg-teal/5 px-4 py-3 text-sm text-navy">
        Todas las filas con nombre tienen el mes completo (sin celdas vacías).
      </section>
    )
  }

  return (
    <section className="no-print mb-4 rounded-2xl border border-amber-300 bg-amber-50/80 p-4 shadow-sm">
      <h2 className="font-display text-lg text-navy">Celdas incompletas</h2>
      <p className="mb-3 text-xs text-muted">
        {rows.length} persona(s) con días sin clave. Puede completar con la
        clave activa.
      </p>
      <ul className="space-y-2">
        {rows.slice(0, 12).map((r) => (
          <li
            key={r.staffId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm"
          >
            <span>
              <strong className="text-navy">{r.fun}</strong> {r.name}
              <span className="ml-2 text-amber-900">
                {r.emptyDays} vacíos / {r.totalDays}
              </span>
            </span>
            {!readOnly && (
              <button
                type="button"
                disabled={!activeCode}
                onClick={() => {
                  const next = fillStaffEmptyDays(doc, r.staffId, activeCode)
                  if (next === doc) {
                    onFlash?.('No había vacíos o no hay clave activa')
                    return
                  }
                  onChange(next)
                  onFlash?.(
                    `${r.name}: vacíos completados con ${activeCode}`,
                  )
                }}
                className="rounded-lg bg-navy px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-40"
              >
                Llenar con {activeCode || '…'}
              </button>
            )}
          </li>
        ))}
      </ul>
      {rows.length > 12 && (
        <p className="mt-2 text-xs text-muted">
          …y {rows.length - 12} más
        </p>
      )}
    </section>
  )
}
