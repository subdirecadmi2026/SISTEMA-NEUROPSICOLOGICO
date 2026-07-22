import { useMemo, useState } from 'react'
import type { ScheduleDoc, ServiceType, StaffMember } from './types'
import { FERIADOS_2026, MONTHS_ES } from './types'
import { createBlankSchedule } from './data/demo'
import {
  SERVICE_LABEL,
  UNITS_ENFERMERIA,
  UNITS_MEDICO,
  shiftMeta,
  shiftsFor,
} from './data/templates'
import {
  cellKey,
  countCodeForStaff,
  daysInMonth,
  isWeekend,
  plannedHours,
  plannedShifts,
  weekdayLetter,
} from './lib/calendar'
import { exportScheduleExcel } from './lib/exportExcel'

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

const now = new Date()

export default function App() {
  const [doc, setDoc] = useState<ScheduleDoc>(() =>
    createBlankSchedule('enfermeria', now.getFullYear(), now.getMonth() + 1),
  )
  const [activeCode, setActiveCode] = useState('D1')
  const [paintMode, setPaintMode] = useState(true)
  const [claveTab, setClaveTab] = useState<'turno' | 'area' | 'ausencia' | 'todas'>(
    'todas',
  )

  const days = useMemo(
    () => daysInMonth(doc.year, doc.month),
    [doc.year, doc.month],
  )
  const shifts = shiftsFor(doc.serviceType)
  const visibleShifts =
    claveTab === 'todas' ? shifts : shifts.filter((s) => s.group === claveTab)
  const units =
    doc.serviceType === 'enfermeria' ? UNITS_ENFERMERIA : UNITS_MEDICO

  function switchService(serviceType: ServiceType) {
    const next = createBlankSchedule(serviceType, doc.year, doc.month)
    setDoc(next)
    setActiveCode(shiftsFor(serviceType).find((s) => s.group === 'turno')?.code ?? '')
    setClaveTab('todas')
  }

  function setCell(staffId: string, day: number, code: string) {
    setDoc((prev) => ({
      ...prev,
      cells: { ...prev.cells, [cellKey(staffId, day)]: code },
    }))
  }

  function clearCell(staffId: string, day: number) {
    setDoc((prev) => {
      const cells = { ...prev.cells }
      delete cells[cellKey(staffId, day)]
      return { ...prev, cells }
    })
  }

  function handleCellClick(staffId: string, day: number) {
    if (!paintMode) return
    const key = cellKey(staffId, day)
    if (doc.cells[key] === activeCode) clearCell(staffId, day)
    else setCell(staffId, day, activeCode)
  }

  function handleCellContext(
    e: React.MouseEvent,
    staffId: string,
    day: number,
  ) {
    e.preventDefault()
    clearCell(staffId, day)
  }

  function addStaff() {
    const isEnf = doc.serviceType === 'enfermeria'
    const member: StaffMember = {
      id: uid(isEnf ? 'enf' : 'med'),
      name: 'Nuevo personal',
      fun: isEnf ? 'ENF' : 'MED',
      role: isEnf ? 'Enfermera' : 'Médico',
      relacionLaboral: 'LOSEP',
      codigoPersonal: isEnf ? 'D1' : 'CE',
      section: isEnf ? 'Enfermeras/os y Auxiliar de Enfermería' : 'Personal médico',
      order: doc.staff.length + 1,
    }
    setDoc((prev) => ({ ...prev, staff: [...prev.staff, member] }))
  }

  function updateStaff(id: string, patch: Partial<StaffMember>) {
    setDoc((prev) => ({
      ...prev,
      staff: prev.staff.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
  }

  function removeStaff(id: string) {
    setDoc((prev) => {
      const cells = { ...prev.cells }
      Object.keys(cells).forEach((k) => {
        if (k.startsWith(`${id}:`)) delete cells[k]
      })
      return {
        ...prev,
        staff: prev.staff
          .filter((s) => s.id !== id)
          .map((s, i) => ({ ...s, order: i + 1 })),
        cells,
      }
    })
  }

  const staffSorted = [...doc.staff].sort((a, b) => a.order - b.order)

  // Group rows by section for nursing
  const sections = useMemo(() => {
    const map = new Map<string, StaffMember[]>()
    for (const s of staffSorted) {
      const key = s.section || 'Personal'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    return [...map.entries()]
  }, [staffSorted])

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-line/80 bg-navy text-white">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="font-display text-lg leading-tight sm:text-xl">
              Hospital General Puyo
            </p>
            <p className="text-xs text-white/70">
              Sistema de horarios · Claves oficiales Enfermería / Medicina · MSP
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-white/25 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              Imprimir
            </button>
            <button
              type="button"
              onClick={() => exportScheduleExcel(doc)}
              className="rounded-lg bg-teal-soft px-3 py-2 text-sm font-semibold text-navy-deep hover:brightness-105"
            >
              Exportar Excel
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1700px] px-3 py-4 sm:px-6 sm:py-6">
        <section className="no-print mb-4 grid gap-3 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-line bg-white/85 p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Tipo de horario (según plantilla HGP)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(['enfermeria', 'medico'] as ServiceType[]).map((t) => {
                const active = doc.serviceType === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => switchService(t)}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-teal bg-teal text-white shadow'
                        : 'border-line bg-sand/50 hover:border-teal/40'
                    }`}
                  >
                    <p className="font-display text-lg">{SERVICE_LABEL[t]}</p>
                    <p className={`text-xs ${active ? 'text-white/80' : 'text-muted'}`}>
                      {t === 'enfermeria'
                        ? 'Claves A1, A2, D1, N1, M, T, MN…'
                        : 'Claves X, PT1, PT2, CE, HA, HM, HD, HE…'}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white/85 p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Período y servicio
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <label className="text-xs text-muted">
                Mes
                <select
                  className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-2 text-sm"
                  value={doc.month}
                  onChange={(e) =>
                    setDoc((p) => ({ ...p, month: Number(e.target.value) }))
                  }
                >
                  {MONTHS_ES.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-muted">
                Año
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-2 text-sm"
                  value={doc.year}
                  onChange={(e) =>
                    setDoc((p) => ({
                      ...p,
                      year: Number(e.target.value) || p.year,
                    }))
                  }
                />
              </label>
              <label className="col-span-2 text-xs text-muted sm:col-span-1">
                Servicio / unidad
                <select
                  className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-2 text-sm"
                  value={doc.unitName}
                  onChange={(e) =>
                    setDoc((p) => ({ ...p, unitName: e.target.value }))
                  }
                >
                  {units.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-2 text-xs text-muted sm:col-span-3">
                Jefe / líder de servicio
                <input
                  className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-2 text-sm"
                  value={doc.jefeServicio}
                  onChange={(e) =>
                    setDoc((p) => ({ ...p, jefeServicio: e.target.value }))
                  }
                  placeholder="Nombre del líder del servicio"
                />
              </label>
            </div>
          </div>
        </section>

        {/* Claves palette */}
        <section className="no-print mb-4 rounded-2xl border border-line bg-white/85 p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-xl text-navy">
                Claves — {SERVICE_LABEL[doc.serviceType]}
              </h2>
              <p className="text-sm text-muted">
                Seleccione una clave y pinte las celdas. Clic derecho borra.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ['todas', 'Todas'],
                  ['turno', 'Turnos'],
                  ...(doc.serviceType === 'medico'
                    ? ([['area', 'Áreas']] as const)
                    : []),
                  ['ausencia', 'Ausencias'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setClaveTab(id)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    claveTab === id
                      ? 'border-navy bg-navy text-white'
                      : 'border-line bg-sand/60 text-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
              <label className="ml-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={paintMode}
                  onChange={(e) => setPaintMode(e.target.checked)}
                />
                Pintar
              </label>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {visibleShifts.map((s) => {
              const active = activeCode === s.code
              return (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => setActiveCode(s.code)}
                  title={`${s.label}${s.timeRange ? ` · ${s.timeRange}` : ''}${s.note ? ` · ${s.note}` : ''}`}
                  className={`rounded-lg border px-3 py-2 text-left transition ${
                    active ? 'ring-2 ring-navy ring-offset-1' : ''
                  }`}
                  style={{
                    background: s.color,
                    color: s.text,
                    borderColor: active ? '#1c3a5c' : '#cfd8e0',
                  }}
                >
                  <span className="block text-sm font-bold leading-none">
                    {s.code}
                  </span>
                  <span className="block max-w-[140px] truncate text-[11px] opacity-85">
                    {s.timeRange ?? s.label}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Sheet */}
        <section className="print-area overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          <div className="border-b border-line bg-gradient-to-r from-navy to-[#5a2a4a] px-4 py-4 text-white sm:px-5">
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
              {MONTHS_ES[doc.month - 1].toUpperCase()} {doc.year} ·{' '}
              {SERVICE_LABEL[doc.serviceType]}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1400px] border-collapse text-[12px]">
              <thead>
                <tr className="bg-sand/90">
                  <th className="sticky left-0 z-20 border border-line bg-sand px-1 py-2">
                    N°
                  </th>
                  <th className="sticky left-7 z-20 border border-line bg-sand px-1 py-2">
                    FUN
                  </th>
                  <th className="sticky left-[3.25rem] z-20 min-w-[180px] border border-line bg-sand px-2 py-2 text-left">
                    Nombres y apellidos
                  </th>
                  <th className="min-w-[110px] border border-line px-1 py-2 text-left">
                    Rel. laboral
                  </th>
                  <th className="min-w-[56px] border border-line px-1 py-2">
                    Código
                  </th>
                  {Array.from({ length: days }, (_, i) => {
                    const d = i + 1
                    const weekend = isWeekend(doc.year, doc.month, d)
                    return (
                      <th
                        key={d}
                        className={`min-w-[32px] border border-line px-0 py-1 text-center ${
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
                  <th className="min-w-[52px] border border-line px-1 py-1 text-center text-[10px] leading-tight">
                    Turnos
                  </th>
                  <th className="min-w-[52px] border border-line px-1 py-1 text-center text-[10px] leading-tight">
                    Horas
                  </th>
                  <th className="min-w-[44px] border border-line px-1 py-1 text-center text-[10px] leading-tight">
                    Vac.
                  </th>
                  <th className="no-print min-w-[56px] border border-line px-1 py-2">
                    —
                  </th>
                </tr>
              </thead>
              <tbody>
                {sections.flatMap(([section, members]) => {
                  const rows = []
                  if (doc.serviceType === 'enfermeria') {
                    rows.push(
                      <tr key={`sec-${section}`}>
                        <td
                          colSpan={5 + days + 4}
                          className="border border-line bg-[#5a2a4a] px-3 py-1.5 text-xs font-semibold text-white"
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
                            className="w-12 rounded border-0 bg-transparent px-0.5 py-1 text-center font-semibold outline-none focus:bg-sand/60"
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
                            className="w-full rounded border-0 bg-transparent px-1 py-1 font-medium outline-none focus:bg-sand/60"
                            value={s.name}
                            onChange={(e) =>
                              updateStaff(s.id, { name: e.target.value })
                            }
                          />
                        </td>
                        <td className="border border-line px-0.5 py-0.5">
                          <input
                            className="w-full rounded border-0 bg-transparent px-1 py-1 text-muted outline-none focus:bg-sand/60"
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
                            className="w-12 rounded border-0 bg-transparent px-0.5 py-1 text-center font-bold text-navy outline-none focus:bg-sand/60"
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
                              onContextMenu={(e) =>
                                handleCellContext(e, s.id, d)
                              }
                              className={`cursor-pointer border border-line px-0 py-0 text-center select-none ${
                                weekend && !code ? 'bg-teal/5' : ''
                              }`}
                              style={
                                meta
                                  ? {
                                      background: meta.color,
                                      color: meta.text,
                                    }
                                  : undefined
                              }
                              title={
                                meta
                                  ? `${meta.code} — ${meta.label}${meta.timeRange ? ` (${meta.timeRange})` : ''}`
                                  : 'Vacío'
                              }
                            >
                              <div className="grid h-8 place-items-center text-[11px] font-bold">
                                {code}
                              </div>
                            </td>
                          )
                        })}
                        <td className="border border-line px-1 text-center font-semibold">
                          {plannedShifts(doc, s.id)}
                        </td>
                        <td className="border border-line px-1 text-center font-semibold text-navy">
                          {plannedHours(doc, s.id)}
                        </td>
                        <td className="border border-line px-1 text-center">
                          {countCodeForStaff(doc, s.id, 'V')}
                        </td>
                        <td className="no-print border border-line px-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeStaff(s.id)}
                            className="rounded px-1 py-1 text-[11px] text-red-700 hover:bg-red-50"
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>,
                    )
                  }
                  return rows
                })}
              </tbody>
            </table>
          </div>

          <div className="no-print flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
            <button
              type="button"
              onClick={addStaff}
              className="rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white hover:bg-navy-deep"
            >
              + Agregar personal
            </button>
            <button
              type="button"
              onClick={() =>
                setDoc(
                  createBlankSchedule(doc.serviceType, doc.year, doc.month),
                )
              }
              className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-sand"
            >
              Regenerar ejemplo
            </button>
          </div>

          <div className="grid gap-4 border-t border-line p-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                Leyenda de claves ({SERVICE_LABEL[doc.serviceType]})
              </p>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-line">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-navy text-white">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Clave</th>
                      <th className="px-2 py-1.5 text-left">Descripción</th>
                      <th className="px-2 py-1.5 text-left">Horario</th>
                      <th className="px-2 py-1.5 text-right">Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((s) => (
                      <tr key={s.code} className="border-t border-line">
                        <td className="px-2 py-1">
                          <span
                            className="inline-block rounded px-1.5 py-0.5 font-bold"
                            style={{ background: s.color, color: s.text }}
                          >
                            {s.code}
                          </span>
                        </td>
                        <td className="px-2 py-1">{s.label}</td>
                        <td className="px-2 py-1 text-muted">
                          {s.timeRange ?? '—'}
                        </td>
                        <td className="px-2 py-1 text-right font-semibold">
                          {s.hours}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs text-muted">
                Plan de contingencia
                <textarea
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
                  rows={2}
                  value={doc.contingencyPlan}
                  onChange={(e) =>
                    setDoc((p) => ({ ...p, contingencyPlan: e.target.value }))
                  }
                />
              </label>
              <label className="block text-xs text-muted">
                Observaciones
                <textarea
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
                  rows={2}
                  value={doc.notes}
                  onChange={(e) =>
                    setDoc((p) => ({ ...p, notes: e.target.value }))
                  }
                />
              </label>
              <div className="rounded-lg border border-line bg-sand/40 p-3 text-xs text-muted">
                <p className="mb-1 font-semibold text-navy">Feriados 2026</p>
                <p>{FERIADOS_2026.join(' · ')}</p>
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
                      className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm"
                      value={doc[key]}
                      onChange={(e) =>
                        setDoc((p) => ({ ...p, [key]: e.target.value }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        <p className="no-print mt-4 text-center text-xs text-muted">
          Horarios HGP · Plantillas alineadas a claves institucionales de
          Enfermería y Medicina
        </p>
      </main>
    </div>
  )
}
