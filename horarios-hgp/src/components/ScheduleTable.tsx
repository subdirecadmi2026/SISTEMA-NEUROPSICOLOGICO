import type { ScheduleDoc, StaffMember } from '../types'
import { MONTHS_ES } from '../types'
import { shiftMeta } from '../data/templates'
import {
  cellKey,
  countCodeForStaff,
  daysInMonth,
  isWeekend,
  plannedHours,
  plannedShifts,
  totalPaidHours,
  weekdayLetter,
} from '../lib/calendar'
import { formatHolidaysLabel } from '../lib/holidays'

type Props = {
  doc: ScheduleDoc
  readOnly: boolean
  paintMode: boolean
  activeCode: string
  onChange: (doc: ScheduleDoc) => void
  onAddStaff: () => void
  onNewDemo: () => void
}

export function ScheduleTable({
  doc,
  readOnly,
  paintMode,
  activeCode,
  onChange,
  onAddStaff,
  onNewDemo,
}: Props) {
  const days = daysInMonth(doc.year, doc.month)
  const isEnf = doc.serviceType === 'enfermeria'
  const summaryCols = isEnf ? 8 : 2
  const staffSorted = [...doc.staff].sort((a, b) => a.order - b.order)

  const sections = (() => {
    const map = new Map<string, StaffMember[]>()
    for (const s of staffSorted) {
      const key = s.section || 'Personal'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    return [...map.entries()]
  })()

  function updateStaff(id: string, patch: Partial<StaffMember>) {
    onChange({
      ...doc,
      staff: doc.staff.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })
  }

  function setCell(staffId: string, day: number, code: string) {
    onChange({
      ...doc,
      cells: { ...doc.cells, [cellKey(staffId, day)]: code },
    })
  }

  function clearCell(staffId: string, day: number) {
    const cells = { ...doc.cells }
    delete cells[cellKey(staffId, day)]
    onChange({ ...doc, cells })
  }

  function handleCellClick(staffId: string, day: number) {
    if (readOnly || !paintMode) return
    const key = cellKey(staffId, day)
    if (doc.cells[key] === activeCode) clearCell(staffId, day)
    else setCell(staffId, day, activeCode)
  }

  function removeStaff(id: string) {
    const cells = { ...doc.cells }
    Object.keys(cells).forEach((k) => {
      if (k.startsWith(`${id}:`)) delete cells[k]
    })
    onChange({
      ...doc,
      staff: doc.staff
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, order: i + 1 })),
      cells,
    })
  }

  return (
    <section className="no-print overflow-hidden rounded-2xl rounded-tl-none border border-line bg-white shadow-sm">
      <div className="border-b border-line bg-gradient-to-r from-navy to-[#2e7d84] px-4 py-4 text-white sm:px-5">
        <div className="flex flex-wrap items-start gap-3">
          <img
            src="/logo_msp.png"
            alt="MSP"
            className="h-12 w-auto rounded bg-white p-1"
          />
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/70">
              {doc.provincial}
            </p>
            <h1 className="font-display text-2xl leading-tight sm:text-3xl">
              {doc.hospital}
            </h1>
            <p className="text-sm text-white/90">{doc.department}</p>
            <p className="mt-1 text-sm font-semibold">
              CUADRO DE TRABAJO DE PERSONAL DIRECTO O INDIRECTO
            </p>
            <p className="mt-2 text-sm text-white/90">
              Servicio: <strong>{doc.unitName}</strong> · Jefe:{' '}
              <strong>{doc.jefeServicio || '—'}</strong> ·{' '}
              {MONTHS_ES[doc.month - 1].toUpperCase()} {doc.year}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1500px] border-collapse text-[11px]">
          <thead>
            <tr className="bg-sand/90">
              <th className="sticky left-0 z-20 border border-line bg-sand px-1 py-2">
                N°
              </th>
              <th className="sticky left-7 z-20 border border-line bg-sand px-1 py-2">
                FUN
              </th>
              <th className="sticky left-[3.25rem] z-20 min-w-[170px] border border-line bg-sand px-2 py-2 text-left">
                Nombres y apellidos
              </th>
              <th className="min-w-[100px] border border-line px-1 py-2 text-left">
                Rel. laboral
              </th>
              <th className="min-w-[50px] border border-line px-1 py-2">Cód.</th>
              {Array.from({ length: days }, (_, i) => {
                const d = i + 1
                const weekend = isWeekend(doc.year, doc.month, d)
                return (
                  <th
                    key={d}
                    className={`min-w-[30px] border border-line px-0 py-1 text-center ${
                      weekend ? 'bg-teal/10' : ''
                    }`}
                  >
                    <div className="text-[9px] font-normal text-muted">
                      {weekdayLetter(doc.year, doc.month, d)}
                    </div>
                    <div className="font-semibold">{d}</div>
                  </th>
                )
              })}
              {isEnf ? (
                <>
                  <th className="min-w-[44px] border border-line px-0.5 py-1 text-[9px] leading-tight">
                    Turnos
                  </th>
                  <th className="min-w-[44px] border border-line px-0.5 py-1 text-[9px] leading-tight">
                    H. plan.
                  </th>
                  <th className="min-w-[36px] border border-line px-0.5 py-1 text-[9px] leading-tight">
                    Vac.
                  </th>
                  <th className="min-w-[40px] border border-line px-0.5 py-1 text-[9px] leading-tight">
                    H. méd.
                  </th>
                  <th className="min-w-[40px] border border-line px-0.5 py-1 text-[9px] leading-tight">
                    H. V.D.
                  </th>
                  <th className="min-w-[40px] border border-line px-0.5 py-1 text-[9px] leading-tight">
                    Lact.
                  </th>
                  <th className="min-w-[40px] border border-line px-0.5 py-1 text-[9px] leading-tight">
                    Extras
                  </th>
                  <th className="min-w-[48px] border border-line px-0.5 py-1 text-[9px] leading-tight">
                    Total pag.
                  </th>
                </>
              ) : (
                <>
                  <th className="min-w-[48px] border border-line px-1 py-1 text-[10px]">
                    Horas
                  </th>
                  <th className="min-w-[100px] border border-line px-1 py-1 text-[10px]">
                    Obs.
                  </th>
                </>
              )}
              {!readOnly && (
                <th className="no-print min-w-[50px] border border-line px-1 py-2">
                  —
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sections.flatMap(([section, members]) => {
              const rows = []
              if (isEnf) {
                rows.push(
                  <tr key={`sec-${section}`}>
                    <td
                      colSpan={5 + days + summaryCols + (readOnly ? 0 : 1)}
                      className="border border-line bg-[#1c5c57] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      {section}
                    </td>
                  </tr>,
                )
              }
              for (const s of members) {
                const globalIdx = staffSorted.findIndex((x) => x.id === s.id)
                rows.push(
                  <tr key={s.id} className="hover:bg-sand/30">
                    <td className="sticky left-0 z-10 border border-line bg-white px-1 py-0.5 text-center">
                      {globalIdx + 1}
                    </td>
                    <td className="sticky left-7 z-10 border border-line bg-white px-0.5 py-0.5">
                      <input
                        disabled={readOnly}
                        className="w-11 rounded border-0 bg-transparent px-0.5 py-1 text-center font-semibold outline-none focus:bg-sand/60 disabled:opacity-70"
                        value={s.fun}
                        onChange={(e) =>
                          updateStaff(s.id, {
                            fun: e.target.value.toUpperCase(),
                          })
                        }
                      />
                    </td>
                    <td className="sticky left-[3.25rem] z-10 border border-line bg-white px-1 py-0.5">
                      <input
                        disabled={readOnly}
                        className={`w-full rounded border-0 bg-transparent px-1 py-1 font-medium outline-none focus:bg-sand/60 disabled:opacity-70 ${
                          !s.name.trim() ? 'placeholder:text-red-400' : ''
                        }`}
                        value={s.name}
                        placeholder="Escriba nombres y apellidos *"
                        onChange={(e) =>
                          updateStaff(s.id, { name: e.target.value })
                        }
                      />
                    </td>
                    <td className="border border-line px-0.5 py-0.5">
                      <input
                        disabled={readOnly}
                        className="w-full rounded border-0 bg-transparent px-1 py-1 text-muted outline-none focus:bg-sand/60 disabled:opacity-70"
                        value={s.relacionLaboral}
                        onChange={(e) =>
                          updateStaff(s.id, {
                            relacionLaboral: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td className="border border-line px-0.5 py-0.5 text-center">
                      <input
                        disabled={readOnly}
                        className="w-11 rounded border-0 bg-transparent px-0.5 py-1 text-center font-bold text-navy outline-none focus:bg-sand/60 disabled:opacity-70"
                        value={s.codigoPersonal}
                        onChange={(e) =>
                          updateStaff(s.id, {
                            codigoPersonal: e.target.value.toUpperCase(),
                          })
                        }
                      />
                    </td>
                    {Array.from({ length: days }, (_, i) => {
                      const d = i + 1
                      const code = doc.cells[cellKey(s.id, d)] ?? ''
                      const meta = code
                        ? shiftMeta(doc.serviceType, code)
                        : undefined
                      const weekend = isWeekend(doc.year, doc.month, d)
                      return (
                        <td
                          key={d}
                          onClick={() => handleCellClick(s.id, d)}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            if (!readOnly) clearCell(s.id, d)
                          }}
                          className={`border border-line px-0 py-0 text-center select-none ${
                            readOnly ? '' : 'cursor-pointer'
                          } ${weekend && !code ? 'bg-teal/5' : ''}`}
                          style={
                            meta
                              ? { background: meta.color, color: meta.text }
                              : undefined
                          }
                          title={
                            meta
                              ? `${meta.code} — ${meta.label}${meta.timeRange ? ` (${meta.timeRange})` : ''}`
                              : 'Vacío'
                          }
                        >
                          <div className="grid h-7 place-items-center text-[10px] font-bold">
                            {code}
                          </div>
                        </td>
                      )
                    })}
                    {isEnf ? (
                      <>
                        <td className="border border-line px-0.5 text-center font-semibold">
                          {plannedShifts(doc, s.id)}
                        </td>
                        <td className="border border-line px-0.5 text-center font-semibold text-navy">
                          {plannedHours(doc, s.id)}
                        </td>
                        <td className="border border-line px-0.5 text-center">
                          {countCodeForStaff(doc, s.id, 'V')}
                        </td>
                        {(
                          [
                            'horasMedicas',
                            'horasViolenciaDomestica',
                            'horasLactancia',
                            'horasExtras',
                          ] as const
                        ).map((field) => (
                          <td key={field} className="border border-line px-0.5">
                            <input
                              type="number"
                              min={0}
                              disabled={readOnly}
                              className="w-full bg-transparent px-0.5 py-1 text-center outline-none focus:bg-sand/50 disabled:opacity-70"
                              value={s[field] ?? 0}
                              onChange={(e) =>
                                updateStaff(s.id, {
                                  [field]: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </td>
                        ))}
                        <td className="border border-line px-0.5 text-center font-bold text-teal">
                          {totalPaidHours(doc, s)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="border border-line px-1 text-center font-semibold text-navy">
                          {plannedHours(doc, s.id)}
                        </td>
                        <td className="border border-line px-0.5">
                          <input
                            disabled={readOnly}
                            className="w-full bg-transparent px-1 py-1 outline-none focus:bg-sand/50 disabled:opacity-70"
                            value={s.observaciones ?? ''}
                            onChange={(e) =>
                              updateStaff(s.id, {
                                observaciones: e.target.value,
                              })
                            }
                          />
                        </td>
                      </>
                    )}
                    {!readOnly && (
                      <td className="no-print border border-line px-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeStaff(s.id)}
                          className="rounded px-1 py-1 text-[11px] text-red-700 hover:bg-red-50"
                        >
                          Quitar
                        </button>
                      </td>
                    )}
                  </tr>,
                )
              }
              return rows
            })}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <div className="no-print flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
          <button
            type="button"
            onClick={onAddStaff}
            className="rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white hover:bg-navy-deep"
          >
            + Agregar personal
          </button>
          <button
            type="button"
            onClick={onNewDemo}
            className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-sand"
          >
            Nuevo ejemplo
          </button>
        </div>
      )}

      <div className="grid gap-4 border-t border-line p-4 lg:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-xs text-muted">
            Observaciones generales
            <textarea
              disabled={readOnly}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm disabled:bg-sand/40"
              rows={2}
              value={doc.notes}
              onChange={(e) => onChange({ ...doc, notes: e.target.value })}
            />
          </label>
          <div className="rounded-lg border border-line bg-sand/40 p-3 text-xs text-muted">
            <p className="mb-1 font-semibold text-navy">
              Feriados {doc.year}
            </p>
            <p>{formatHolidaysLabel(doc.year)}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(
            [
              ['elaboradoPor', 'Elaborado por'],
              ['revisadoPor', 'Revisado por'],
              ['aprobadoPor', 'Aprobado por'],
              ['talentoHumano', 'Talento Humano'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-xs text-muted">
              {label}
              <input
                disabled={readOnly}
                className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm disabled:bg-sand/40"
                value={doc[key]}
                onChange={(e) =>
                  onChange({ ...doc, [key]: e.target.value })
                }
              />
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}
