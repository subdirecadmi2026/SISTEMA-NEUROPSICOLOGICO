import { useMemo, useState } from 'react'
import type { ScheduleDoc } from '../types'
import {
  emptyCellsReport,
  fillStaffEmptyDays,
  replaceCodeInSchedule,
} from '../lib/scheduleOps'
import { shiftsFor } from '../data/templates'

type Props = {
  doc: ScheduleDoc
  readOnly: boolean
  activeCode: string
  onChange: (doc: ScheduleDoc) => void
  onFlash?: (msg: string) => void
}

type Tab = 'vacios' | 'reemplazar'

/**
 * Un solo módulo: celdas incompletas + reemplazo de clave.
 */
export function CellAdjustModule({
  doc,
  readOnly,
  activeCode,
  onChange,
  onFlash,
}: Props) {
  const [tab, setTab] = useState<Tab>('vacios')
  const codes = useMemo(
    () => shiftsFor(doc.serviceType).map((s) => s.code),
    [doc.serviceType],
  )
  const [from, setFrom] = useState(codes[0] ?? '')
  const [to, setTo] = useState(codes[1] ?? codes[0] ?? '')
  const rows = emptyCellsReport(doc)
  const named = doc.staff.some((s) => s.name.trim())

  if (readOnly) return null
  if (!named && rows.length === 0) return null

  return (
    <section className="no-print mb-4 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-gradient-to-r from-amber-50/80 to-white px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Ajustes
          </p>
          <h2 className="font-display text-lg text-navy">Celdas del mes</h2>
        </div>
        {rows.length > 0 && (
          <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-950">
            {rows.length} incompleta{rows.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="px-4 pt-3">
        <div className="inline-flex gap-1 rounded-xl bg-sand/70 p-1">
          {(
            [
              ['vacios', 'Incompletas'],
              ['reemplazar', 'Reemplazar'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                tab === id
                  ? 'bg-navy text-white shadow-sm'
                  : 'text-muted hover:bg-white hover:text-navy'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {tab === 'vacios' && (
          <>
            {rows.length === 0 ? (
              <p className="rounded-xl border border-teal/25 bg-teal/5 px-3 py-3 text-sm text-navy">
                Todas las filas con nombre están completas.
              </p>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted">
                  Complete vacíos con la clave activa{' '}
                  <strong className="text-navy">{activeCode || '—'}</strong>.
                </p>
                <ul className="space-y-2">
                  {rows.slice(0, 10).map((r) => (
                    <li
                      key={r.staffId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-sand/30 px-3 py-2.5 text-sm"
                    >
                      <span>
                        <strong className="text-navy">{r.fun}</strong> {r.name}
                        <span className="ml-2 text-amber-900">
                          {r.emptyDays}/{r.totalDays} vacíos
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={!activeCode}
                        onClick={() => {
                          const next = fillStaffEmptyDays(
                            doc,
                            r.staffId,
                            activeCode,
                          )
                          if (next === doc) {
                            onFlash?.('No había vacíos o no hay clave activa')
                            return
                          }
                          onChange(next)
                          onFlash?.(
                            `${r.name}: vacíos completados con ${activeCode}`,
                          )
                        }}
                        className="rounded-xl bg-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        Llenar con {activeCode || '…'}
                      </button>
                    </li>
                  ))}
                </ul>
                {rows.length > 10 && (
                  <p className="mt-2 text-xs text-muted">
                    …y {rows.length - 10} más
                  </p>
                )}
              </>
            )}
          </>
        )}

        {tab === 'reemplazar' && (
          <>
            <p className="mb-3 text-sm text-muted">
              Cambie una clave por otra en todas las celdas del mes.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-semibold text-muted">
                Desde
                <select
                  className="mt-1 block min-w-[5rem] rounded-xl border border-line bg-white px-3 py-2 text-sm text-navy"
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
              <span className="pb-2.5 text-lg text-muted">→</span>
              <label className="text-xs font-semibold text-muted">
                Hacia
                <select
                  className="mt-1 block min-w-[5rem] rounded-xl border border-line bg-white px-3 py-2 text-sm text-navy"
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
                className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-deep"
              >
                Reemplazar
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
