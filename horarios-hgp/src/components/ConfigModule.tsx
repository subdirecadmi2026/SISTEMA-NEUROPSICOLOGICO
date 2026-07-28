import { useState, type ReactNode } from 'react'
import type { ScheduleDoc, ServiceType } from '../types'
import { MONTHS_ES } from '../types'
import { SERVICE_LABEL } from '../data/templates'
import { applyScheduleFlagsToGrid } from '../lib/scheduleOps'

type Props = {
  doc: ScheduleDoc
  readOnly: boolean
  units: string[]
  onSwitchService: (t: ServiceType) => void
  onPatch: (next: ScheduleDoc) => void
  notesSlot?: ReactNode
  onFlash?: (msg: string) => void
}

type Tab = 'tipo' | 'periodo' | 'notas'

const COVERAGE_PRESETS_MED = [
  { label: 'Consulta (2 / 16 h)', minStaff: 2, minHours: 16 },
  { label: 'Guardia (1 / 24 h)', minStaff: 1, minHours: 24 },
  { label: 'Mixto (2 / 24 h)', minStaff: 2, minHours: 24 },
  { label: 'UCI (3 / 36 h)', minStaff: 3, minHours: 36 },
] as const

/** Configuración del horario en un solo módulo. */
export function ConfigModule({
  doc,
  readOnly,
  units,
  onSwitchService,
  onPatch,
  notesSlot,
  onFlash,
}: Props) {
  const [tab, setTab] = useState<Tab>('periodo')
  const [open, setOpen] = useState(false)
  const isMed = doc.serviceType === 'medico'
  const named = doc.staff.filter((s) => s.name.trim()).length

  function setFlags(next: { vacacionesFlag: boolean; llamado: boolean }) {
    const { doc: painted, painted: n } = applyScheduleFlagsToGrid(doc, next)
    onPatch(painted)
    if (next.vacacionesFlag && !doc.vacacionesFlag) {
      onFlash?.(
        n > 0
          ? `Vacaciones del mes: marcadas ${n} celda(s) con V en el horario`
          : 'Vacaciones del mes activadas (cabecera). Marque médicos en Personal si ya tenían turnos.',
      )
    } else if (next.llamado && !doc.llamado) {
      onFlash?.(
        n > 0
          ? `Bajo llamado: marcadas ${n} celda(s) con BL en el horario`
          : 'Bajo llamado activado (cabecera). Marque médicos en Personal si ya tenían turnos.',
      )
    } else if (!next.vacacionesFlag && doc.vacacionesFlag) {
      onFlash?.('Vacaciones del mes desactivadas · se quitaron las V del cuadro')
    } else if (!next.llamado && doc.llamado) {
      onFlash?.('Bajo llamado desactivado · se quitaron las BL del cuadro')
    }
  }

  return (
    <section className="no-print mb-4 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-navy/[0.04] to-teal/[0.05] px-4 py-3 text-left"
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Configuración {isMed ? 'médica' : ''}
          </p>
          <h2 className="font-display text-lg text-navy">
            {SERVICE_LABEL[doc.serviceType]} · {MONTHS_ES[doc.month - 1]}{' '}
            {doc.year}
          </h2>
          <p className="text-xs text-muted">
            {isMed ? 'Especialidad: ' : ''}
            {doc.unitName}
            {doc.jefeServicio ? ` · ${doc.jefeServicio}` : ''}
            {isMed ? ` · ${named}/${doc.staff.length} médicos` : ''}
            {doc.vacacionesFlag ? ' · Vacaciones' : ''}
            {doc.llamado ? ' · Bajo llamado' : ''}
          </p>
        </div>
        <span className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted ring-1 ring-line">
          {open ? 'Cerrar' : 'Editar'}
        </span>
      </button>

      {open && (
        <>
          <div className="border-t border-line px-4 pt-3">
            <div className="inline-flex gap-1 rounded-xl bg-sand/70 p-1">
              {(
                [
                  ['periodo', 'Período'],
                  ['tipo', 'Tipo'],
                  ['notas', 'Notas'],
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
            {tab === 'tipo' && (
              <div className="grid grid-cols-2 gap-2">
                {(['enfermeria', 'medico'] as ServiceType[]).map((t) => {
                  const active = doc.serviceType === t
                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={readOnly}
                      onClick={() => onSwitchService(t)}
                      className={`rounded-xl border px-4 py-3 text-left transition disabled:opacity-60 ${
                        active
                          ? 'border-teal bg-teal text-white shadow'
                          : 'border-line bg-sand/50 hover:border-teal/40'
                      }`}
                    >
                      <p className="font-display text-lg">
                        {SERVICE_LABEL[t]}
                      </p>
                      <p
                        className={`text-xs ${active ? 'text-white/80' : 'text-muted'}`}
                      >
                        {t === 'enfermeria'
                          ? 'Plantilla Gestión de Enfermería'
                          : 'Cuadro de trabajo médico'}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}

            {tab === 'periodo' && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <label className="text-xs text-muted">
                  Mes
                  <select
                    disabled={readOnly}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-2 py-2 text-sm disabled:opacity-70"
                    value={doc.month}
                    onChange={(e) =>
                      onPatch({ ...doc, month: Number(e.target.value) })
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
                    disabled={readOnly}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-2 py-2 text-sm disabled:opacity-70"
                    value={doc.year}
                    onChange={(e) =>
                      onPatch({
                        ...doc,
                        year: Number(e.target.value) || doc.year,
                      })
                    }
                  />
                </label>
                <label className="col-span-2 text-xs text-muted sm:col-span-1">
                  {isMed ? 'Especialidad' : 'Servicio'}
                  <select
                    disabled={readOnly}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-2 py-2 text-sm disabled:opacity-70"
                    value={doc.unitName}
                    onChange={(e) =>
                      onPatch({ ...doc, unitName: e.target.value })
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
                  {isMed
                    ? 'Jefe / líder de especialidad'
                    : 'Jefe / líder de servicio'}
                  <input
                    disabled={readOnly}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-2 py-2 text-sm disabled:opacity-70"
                    value={doc.jefeServicio}
                    onChange={(e) =>
                      onPatch({ ...doc, jefeServicio: e.target.value })
                    }
                    placeholder={
                      isMed ? 'Ej. Dr. Juan Pérez — jefe de servicio' : undefined
                    }
                  />
                </label>

                <div className="col-span-2 rounded-xl border border-line bg-sand/30 p-3 sm:col-span-3">
                  <p className="mb-2 text-xs font-semibold text-navy">
                    Estado del mes (se refleja en el horario)
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        checked={doc.vacacionesFlag}
                        onChange={(e) =>
                          setFlags({
                            vacacionesFlag: e.target.checked,
                            // Vacaciones y bajo llamado a nivel cuadro son excluyentes
                            llamado: e.target.checked ? false : doc.llamado,
                          })
                        }
                      />
                      Vacaciones del mes
                      <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-900">
                        V
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        checked={doc.llamado}
                        onChange={(e) =>
                          setFlags({
                            llamado: e.target.checked,
                            vacacionesFlag: e.target.checked
                              ? false
                              : doc.vacacionesFlag,
                          })
                        }
                      />
                      Bajo llamado
                      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-900">
                        BL
                      </span>
                    </label>
                  </div>
                  <p className="mt-2 text-[11px] text-muted">
                    Al activar, se marcan los días vacíos del personal en el
                    cuadro. Para un solo médico, use la columna Estado en
                    Personal.
                  </p>
                </div>

                <label className="col-span-2 text-xs text-muted sm:col-span-3">
                  Cobertura mínima (personas / horas día)
                  <div className="mt-1 flex gap-2">
                    <input
                      type="number"
                      min={0}
                      disabled={readOnly}
                      className="w-24 rounded-xl border border-line px-2 py-1.5 text-sm"
                      value={doc.coverageRule.minStaffPerDay}
                      onChange={(e) =>
                        onPatch({
                          ...doc,
                          coverageRule: {
                            ...doc.coverageRule,
                            minStaffPerDay: Number(e.target.value) || 0,
                          },
                        })
                      }
                    />
                    <input
                      type="number"
                      min={0}
                      disabled={readOnly}
                      className="w-24 rounded-xl border border-line px-2 py-1.5 text-sm"
                      value={doc.coverageRule.minHoursPerDay}
                      onChange={(e) =>
                        onPatch({
                          ...doc,
                          coverageRule: {
                            ...doc.coverageRule,
                            minHoursPerDay: Number(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                  {isMed && !readOnly ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {COVERAGE_PRESETS_MED.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() =>
                            onPatch({
                              ...doc,
                              coverageRule: {
                                minStaffPerDay: p.minStaff,
                                minHoursPerDay: p.minHours,
                              },
                            })
                          }
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                            doc.coverageRule.minStaffPerDay === p.minStaff &&
                            doc.coverageRule.minHoursPerDay === p.minHours
                              ? 'border-teal bg-teal/10 text-teal'
                              : 'border-line text-muted hover:border-teal/40'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </label>
              </div>
            )}

            {tab === 'notas' && (notesSlot ?? null)}
          </div>
        </>
      )}
    </section>
  )
}
