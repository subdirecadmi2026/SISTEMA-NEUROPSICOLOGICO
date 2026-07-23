import { useEffect, useRef, useState } from 'react'
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
import { formatHolidaysLabel, holidayDatesInMonth } from '../lib/holidays'
import { fillStaffEmptyDays, paintDayColumn, moveStaffOrder, duplicateStaffRow, clearStaffRowCells, copyCellsBetweenStaff } from '../lib/scheduleOps'
import { leaveConflictIfPaint, leaveDayMapForDoc, countLeaveConflictsForDay } from '../lib/leaveValidation'

type Props = {
  doc: ScheduleDoc
  readOnly: boolean
  paintMode: boolean
  activeCode: string
  highlightEmpty?: boolean
  compact?: boolean
  focusDay?: number | null
  onChange: (doc: ScheduleDoc) => void
  onAddStaff: () => void
  onNewDemo: () => void
  onFlash?: (msg: string) => void
}

export function ScheduleTable({
  doc,
  readOnly,
  paintMode,
  activeCode,
  highlightEmpty = false,
  compact = false,
  focusDay = null,
  onChange,
  onAddStaff,
  onNewDemo,
  onFlash,
}: Props) {
  const days = daysInMonth(doc.year, doc.month)
  const isEnf = doc.serviceType === 'enfermeria'
  /** FUN (ENF/AUX…) solo aplica en enfermería; en médico siempre es MED y se omite en grilla. */
  const showFun = isEnf
  const staffCols = showFun ? 5 : 4
  const summaryCols = isEnf ? 8 : 2
  const staffSorted = [...doc.staff].sort((a, b) => a.order - b.order)
  const holidays = holidayDatesInMonth(doc.year, doc.month)
  const leaveMap = leaveDayMapForDoc(doc)
  const dragging = useRef(false)
  const dragMode = useRef<'paint' | 'erase'>('paint')
  const dragWarned = useRef(false)
  const docRef = useRef(doc)
  docRef.current = doc
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const paintBuffer = useRef<Record<string, string> | null>(null)
  const [previewCells, setPreviewCells] = useState<Record<
    string,
    string
  > | null>(null)
  const [staffFilter, setStaffFilter] = useState('')
  const dayRefs = useRef<Record<number, HTMLTableCellElement | null>>({})

  useEffect(() => {
    if (!focusDay) return
    const el = dayRefs.current[focusDay]
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [focusDay])

  useEffect(() => {
    const stop = () => {
      if (!dragging.current) return
      dragging.current = false
      dragWarned.current = false
      if (paintBuffer.current) {
        const current = docRef.current
        const next = { ...current, cells: paintBuffer.current }
        docRef.current = next
        onChangeRef.current(next)
        paintBuffer.current = null
      }
      setPreviewCells(null)
    }
    window.addEventListener('mouseup', stop)
    window.addEventListener('touchend', stop)
    return () => {
      window.removeEventListener('mouseup', stop)
      window.removeEventListener('touchend', stop)
    }
  }, [])

  const liveCells = previewCells ?? doc.cells
  const filterNorm = staffFilter.trim().toLowerCase()

  const sections = (() => {
    const map = new Map<string, StaffMember[]>()
    for (const s of staffSorted) {
      if (
        filterNorm &&
        !s.name.toLowerCase().includes(filterNorm) &&
        !s.fun.toLowerCase().includes(filterNorm) &&
        !s.codigoPersonal.toLowerCase().includes(filterNorm)
      ) {
        continue
      }
      const key = s.section || 'Personal'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    return [...map.entries()]
  })()

  function commit(next: ScheduleDoc) {
    docRef.current = next
    onChangeRef.current(next)
  }

  function updateStaff(id: string, patch: Partial<StaffMember>) {
    const current = docRef.current
    commit({
      ...current,
      staff: current.staff.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })
  }

  function clearCell(staffId: string, day: number) {
    const current = docRef.current
    const cells = { ...current.cells }
    delete cells[cellKey(staffId, day)]
    commit({ ...current, cells })
  }

  function paintIntoBuffer(
    staffId: string,
    day: number,
    mode: 'paint' | 'erase',
  ) {
    if (!paintBuffer.current) {
      paintBuffer.current = { ...docRef.current.cells }
    }
    const key = cellKey(staffId, day)
    if (mode === 'erase') {
      delete paintBuffer.current[key]
    } else {
      paintBuffer.current[key] = activeCode
    }
    setPreviewCells({ ...paintBuffer.current })
  }

  function applyPaint(staffId: string, day: number, mode: 'paint' | 'erase') {
    if (readOnly || !paintMode) return
    if (mode === 'paint') {
      const warn = leaveConflictIfPaint(
        docRef.current,
        staffId,
        day,
        activeCode,
      )
      if (warn && !dragWarned.current) {
        onFlash?.(warn)
        dragWarned.current = true
      }
    }
    if (dragging.current) {
      paintIntoBuffer(staffId, day, mode)
      return
    }
    if (mode === 'erase') {
      clearCell(staffId, day)
      return
    }
    const current = docRef.current
    const key = cellKey(staffId, day)
    if (current.cells[key] === activeCode) return
    commit({
      ...current,
      cells: { ...current.cells, [key]: activeCode },
    })
  }

  function removeStaff(id: string) {
    const current = docRef.current
    const cells = { ...current.cells }
    Object.keys(cells).forEach((k) => {
      if (k.startsWith(`${id}:`)) delete cells[k]
    })
    commit({
      ...current,
      staff: current.staff
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

      <div className="no-print flex flex-wrap items-center gap-2 border-b border-line bg-sand/30 px-4 py-2">
        <label className="text-xs text-muted">
          Buscar personal
          <input
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            placeholder="Nombre, FUN o código…"
            className="ml-2 rounded-lg border border-line bg-white px-2 py-1.5 text-sm"
          />
        </label>
        {staffFilter && (
          <button
            type="button"
            onClick={() => setStaffFilter('')}
            className="rounded border border-line px-2 py-1 text-xs hover:bg-white"
          >
            Limpiar filtro
          </button>
        )}
        <p className="text-[11px] text-muted">
          Clic en el número del día = pintar columna · Clic derecho = borrar
          columna
          {compact ? ' · Modo compacto' : ''}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table
          className={`w-full border-collapse ${compact ? 'min-w-[1200px] text-[10px]' : 'min-w-[1500px] text-[11px]'}`}
        >
          <thead>
            <tr className="bg-sand/90">
              <th className="sticky left-0 z-20 border border-line bg-sand px-1 py-2">
                N°
              </th>
              {showFun && (
                <th className="sticky left-7 z-20 border border-line bg-sand px-1 py-2">
                  FUN
                </th>
              )}
              <th
                className={`sticky z-20 min-w-[170px] border border-line bg-sand px-2 py-2 text-left ${
                  showFun ? 'left-[3.25rem]' : 'left-7'
                }`}
              >
                Nombres y apellidos
              </th>
              <th className="min-w-[100px] border border-line px-1 py-2 text-left">
                Rel. laboral
              </th>
              <th className="min-w-[50px] border border-line px-1 py-2">Cód.</th>
              {Array.from({ length: days }, (_, i) => {
                const d = i + 1
                const weekend = isWeekend(doc.year, doc.month, d)
                const holiday = holidays.has(d)
                const focused = focusDay === d
                return (
                  <th
                    key={d}
                    ref={(el) => {
                      dayRefs.current[d] = el
                    }}
                    data-day={d}
                    title={
                      holiday
                        ? 'Feriado · clic pinta columna'
                        : weekend
                          ? 'Fin de semana · clic pinta columna'
                          : 'Clic: pintar columna · clic derecho: borrar'
                    }
                    onClick={() => {
                      if (readOnly || !paintMode || !activeCode) return
                      const conflicts = countLeaveConflictsForDay(
                        docRef.current,
                        d,
                        activeCode,
                      )
                      if (conflicts > 0) {
                        onFlash?.(
                          `Día ${d}: ${conflicts} persona(s) con permiso/vacaciones — no use turno productivo`,
                        )
                      }
                      onChange(paintDayColumn(docRef.current, d, activeCode))
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      if (readOnly) return
                      onChange(paintDayColumn(docRef.current, d, null))
                    }}
                    className={`min-w-[30px] border border-line px-0 py-1 text-center ${
                      readOnly ? '' : 'cursor-pointer hover:ring-2 hover:ring-navy/40'
                    } ${
                      focused
                        ? 'bg-navy text-white'
                        : holiday
                          ? 'bg-amber-200/80'
                          : weekend
                            ? 'bg-teal/10'
                            : ''
                    }`}
                  >
                    <div
                      className={`text-[9px] font-normal ${focused ? 'text-white/80' : 'text-muted'}`}
                    >
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
                <th className="no-print min-w-[52px] border border-line px-1 py-2">
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
                      colSpan={
                        staffCols + days + summaryCols + (readOnly ? 0 : 1)
                      }
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
                    {showFun && (
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
                    )}
                    <td
                      className={`sticky z-10 border border-line bg-white px-1 py-0.5 ${
                        showFun ? 'left-[3.25rem]' : 'left-7'
                      }`}
                    >
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
                      const code = liveCells[cellKey(s.id, d)] ?? ''
                      const meta = code
                        ? shiftMeta(doc.serviceType, code)
                        : undefined
                      const weekend = isWeekend(doc.year, doc.month, d)
                      const holiday = holidays.has(d)
                      const leaveInfo = leaveMap.get(s.id)
                      const leaveCode = leaveInfo?.get(d)
                      const onLeave = !!leaveCode
                      return (
                        <td
                          key={d}
                          onMouseDown={(e) => {
                            if (readOnly || !paintMode || e.button !== 0) return
                            e.preventDefault()
                            dragging.current = true
                            dragWarned.current = false
                            const key = cellKey(s.id, d)
                            dragMode.current =
                              (liveCells[key] ?? '') === activeCode
                                ? 'erase'
                                : 'paint'
                            applyPaint(s.id, d, dragMode.current)
                          }}
                          onMouseEnter={() => {
                            if (!dragging.current) return
                            applyPaint(s.id, d, dragMode.current)
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            if (!readOnly) clearCell(s.id, d)
                          }}
                          className={`border border-line px-0 py-0 text-center select-none ${
                            readOnly ? '' : 'cursor-pointer'
                          } ${
                            onLeave
                              ? 'ring-1 ring-inset ring-teal/55'
                              : !code && highlightEmpty
                                ? 'bg-rose-100/80 ring-1 ring-inset ring-rose-300'
                                : !code && holiday
                                  ? 'bg-amber-50'
                                  : !code && weekend
                                    ? 'bg-teal/5'
                                    : ''
                          }`}
                          style={
                            meta
                              ? { background: meta.color, color: meta.text }
                              : onLeave && !code
                                ? { background: 'rgba(46, 125, 132, 0.08)' }
                                : undefined
                          }
                          title={
                            onLeave
                              ? meta
                                ? `${meta.code} — ${meta.label} · permiso/vacaciones (clave ${leaveCode})`
                                : `Permiso/vacaciones · marque ${leaveCode}`
                              : meta
                                ? `${meta.code} — ${meta.label}${meta.timeRange ? ` (${meta.timeRange})` : ''}`
                                : holiday
                                  ? 'Feriado (vacío)'
                                  : 'Vacío · arrastre para pintar'
                          }
                        >
                          <div
                            className={`grid place-items-center font-bold ${compact ? 'h-5 text-[9px]' : 'h-7 text-[10px]'}`}
                          >
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
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            title="Subir"
                            onClick={() =>
                              onChange(moveStaffOrder(docRef.current, s.id, -1))
                            }
                            className="rounded px-1 py-0.5 text-[10px] text-navy hover:bg-sand"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            title="Bajar"
                            onClick={() =>
                              onChange(moveStaffOrder(docRef.current, s.id, 1))
                            }
                            className="rounded px-1 py-0.5 text-[10px] text-navy hover:bg-sand"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            title={`Llenar vacíos con ${activeCode || 'clave'}`}
                            disabled={!activeCode}
                            onClick={() => {
                              if (!activeCode) return
                              onChange(
                                fillStaffEmptyDays(
                                  docRef.current,
                                  s.id,
                                  activeCode,
                                ),
                              )
                            }}
                            className="rounded px-1 py-0.5 text-[10px] text-navy hover:bg-sand disabled:opacity-40"
                          >
                            Fila
                          </button>
                          <button
                            type="button"
                            title="Duplicar fila"
                            onClick={() =>
                              onChange(duplicateStaffRow(docRef.current, s.id))
                            }
                            className="rounded px-1 py-0.5 text-[10px] text-navy hover:bg-sand"
                          >
                            Dup
                          </button>
                          <button
                            type="button"
                            title="Copiar turnos de la fila anterior (solo vacíos)"
                            disabled={globalIdx <= 0}
                            onClick={() => {
                              const prev = staffSorted[globalIdx - 1]
                              if (!prev) return
                              onChange(
                                copyCellsBetweenStaff(
                                  docRef.current,
                                  prev.id,
                                  s.id,
                                ),
                              )
                            }}
                            className="rounded px-1 py-0.5 text-[10px] text-navy hover:bg-sand disabled:opacity-40"
                          >
                            ←Copia
                          </button>
                          <button
                            type="button"
                            title="Limpiar celdas de esta fila"
                            onClick={() =>
                              onChange(clearStaffRowCells(docRef.current, s.id))
                            }
                            className="rounded px-1 py-0.5 text-[10px] text-amber-800 hover:bg-amber-50"
                          >
                            Limpiar
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStaff(s.id)}
                            className="rounded px-1 py-0.5 text-[10px] text-red-700 hover:bg-red-50"
                          >
                            Quitar
                          </button>
                        </div>
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
          <p className="text-xs text-muted">
            Contorno teal = día con permiso/vacaciones. Arrastre para pintar ·
            clic derecho borra · «Fila» llena vacíos.
          </p>
        </div>
      )}

      <div className="border-t border-line bg-sand/40 px-4 py-2 text-[11px] text-muted">
        Feriados {doc.year}: {formatHolidaysLabel(doc.year)}
      </div>
    </section>
  )
}
