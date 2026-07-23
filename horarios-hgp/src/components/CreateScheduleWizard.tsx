import { useMemo, useState } from 'react'
import type { ScheduleDoc, ServiceType, StaffMember } from '../types'
import { MONTHS_ES, uid } from '../types'
import { createBlankSchedule } from '../data/demo'
import {
  SERVICE_LABEL,
  UNITS_ENFERMERIA,
  UNITS_MEDICO,
} from '../data/templates'
import { createEmptyStaff, listStaff } from '../lib/staffLibrary'
import { copyStaffFromPreviousMonth } from '../lib/scheduleOps'

export type CreateScheduleInput = {
  serviceType: ServiceType
  unitName: string
  month: number
  year: number
  jefeServicio: string
  staffCount: number
  useLibrary: boolean
}

type Props = {
  open: boolean
  defaultYear: number
  defaultMonth: number
  onClose: () => void
  onCreate: (doc: ScheduleDoc) => void
}

const MIN_STAFF = 1
const MAX_STAFF = 40

function makeSlots(
  serviceType: ServiceType,
  unitName: string,
  count: number,
): StaffMember[] {
  return Array.from({ length: count }, (_, i) => {
    const base = createEmptyStaff(serviceType, unitName)
    return {
      ...base,
      id: uid(serviceType === 'enfermeria' ? 'enf' : 'med'),
      name: '',
      order: i + 1,
    }
  })
}

export function CreateScheduleWizard({
  open,
  defaultYear,
  defaultMonth,
  onClose,
  onCreate,
}: Props) {
  const [serviceType, setServiceType] = useState<ServiceType>('medico')
  const [unitName, setUnitName] = useState(UNITS_MEDICO[0])
  const [customUnit, setCustomUnit] = useState('')
  const [useCustomUnit, setUseCustomUnit] = useState(false)
  const [month, setMonth] = useState(defaultMonth)
  const [year, setYear] = useState(defaultYear)
  const [jefeServicio, setJefeServicio] = useState('')
  const [staffCount, setStaffCount] = useState(5)
  const [useLibrary, setUseLibrary] = useState(true)
  const [copyPrevStaff, setCopyPrevStaff] = useState(false)
  const [creating, setCreating] = useState(false)

  const units = serviceType === 'enfermeria' ? UNITS_ENFERMERIA : UNITS_MEDICO

  const resolvedUnit = useCustomUnit
    ? customUnit.trim()
    : unitName

  const libraryCount = useMemo(() => {
    if (!resolvedUnit) return 0
    return listStaff(serviceType, resolvedUnit).filter((s) => s.active !== false)
      .length
  }, [serviceType, resolvedUnit])

  if (!open) return null

  function switchType(t: ServiceType) {
    setServiceType(t)
    setUseCustomUnit(false)
    setCustomUnit('')
    setUnitName(t === 'enfermeria' ? UNITS_ENFERMERIA[0] : UNITS_MEDICO[0])
  }

  async function handleCreate() {
    if (!resolvedUnit) return
    if (staffCount < MIN_STAFF) return
    setCreating(true)
    try {
      const lib = listStaff(serviceType, resolvedUnit).filter(
        (s) => s.active !== false,
      )

      let staff: StaffMember[]
      if (copyPrevStaff) {
        const probe = createBlankSchedule(serviceType, year, month, {
          withDemo: false,
          unitName: resolvedUnit,
          staff: [],
        })
        const prev = await copyStaffFromPreviousMonth(probe)
        if (prev.ok && prev.staff.length > 0) {
          staff = prev.staff
          while (staff.length < staffCount) {
            const slot = createEmptyStaff(serviceType, resolvedUnit)
            staff.push({
              ...slot,
              id: uid(serviceType === 'enfermeria' ? 'enf' : 'med'),
              name: '',
              order: staff.length + 1,
            })
          }
          if (staff.length > staffCount) staff = staff.slice(0, staffCount)
        } else {
          staff = makeSlots(serviceType, resolvedUnit, staffCount)
        }
      } else if (useLibrary && lib.length > 0) {
        staff = lib.slice(0, staffCount).map((s, i) => ({ ...s, order: i + 1 }))
        while (staff.length < staffCount) {
          const slot = createEmptyStaff(serviceType, resolvedUnit)
          staff.push({
            ...slot,
            id: uid(serviceType === 'enfermeria' ? 'enf' : 'med'),
            name: '',
            order: staff.length + 1,
          })
        }
      } else {
        staff = makeSlots(serviceType, resolvedUnit, staffCount)
      }

      const doc = createBlankSchedule(serviceType, year, month, {
        withDemo: false,
        unitName: resolvedUnit,
        staff,
      })
      doc.jefeServicio = jefeServicio.trim()
      onCreate(doc)
      onClose()
    } finally {
      setCreating(false)
    }
  }

  const canCreate =
    resolvedUnit.length > 0 &&
    staffCount >= MIN_STAFF &&
    staffCount <= MAX_STAFF

  return (
    <div className="no-print fixed inset-0 z-[60] flex items-end justify-center bg-navy/50 p-3 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="crear-horario-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-white shadow-xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-gradient-to-r from-navy to-teal px-5 py-4 text-white">
          <div>
            <h2 id="crear-horario-title" className="font-display text-2xl">
              Crear horario
            </h2>
            <p className="text-sm text-white/80">
              Elija especialidad/servicio y cuántos especialistas constarán en el
              cuadro (mínimo {MIN_STAFF}, puede ser más de 10).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/30 px-2 py-1 text-sm hover:bg-white/10"
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* 1. Tipo */}
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              1. Tipo de plantilla
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(['enfermeria', 'medico'] as ServiceType[]).map((t) => {
                const active = serviceType === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => switchType(t)}
                    className={`rounded-xl border px-4 py-3 text-left ${
                      active
                        ? 'border-teal bg-teal text-white'
                        : 'border-line bg-sand/40 hover:border-teal/40'
                    }`}
                  >
                    <p className="font-display text-lg">{SERVICE_LABEL[t]}</p>
                    <p
                      className={`text-xs ${active ? 'text-white/80' : 'text-muted'}`}
                    >
                      {t === 'enfermeria'
                        ? 'Gestión de Cuidados de Enfermería'
                        : 'Personal médico / especialidades'}
                    </p>
                  </button>
                )
              })}
            </div>
          </section>

          {/* 2. Especialidad */}
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              2. Especialidad / servicio
            </p>
            {!useCustomUnit ? (
              <select
                className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
              >
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="w-full rounded-lg border border-line px-3 py-2.5 text-sm"
                placeholder="Escriba el nombre del servicio o especialidad"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
              />
            )}
            <label className="mt-2 flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={useCustomUnit}
                onChange={(e) => setUseCustomUnit(e.target.checked)}
              />
              Otra especialidad / servicio (escribir)
            </label>
          </section>

          {/* 3. Período */}
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              3. Período y líder
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <label className="text-xs text-muted">
                Mes
                <select
                  className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm"
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
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
                  className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value) || year)}
                />
              </label>
              <label className="col-span-2 text-xs text-muted sm:col-span-1">
                Jefe / líder
                <input
                  className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm"
                  value={jefeServicio}
                  onChange={(e) => setJefeServicio(e.target.value)}
                  placeholder="Nombre del líder"
                />
              </label>
            </div>
          </section>

          {/* 4. Cantidad de personal */}
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              4. Personal que debe constar en el horario
            </p>
            <p className="mb-3 text-sm text-muted">
              Cada horario de servicio puede tener{' '}
              <strong>mínimo 1</strong> especialista o{' '}
              <strong>más de 10</strong>. Indique cuántos deben figurar en este
              cuadro.
            </p>
            <div className="flex flex-wrap items-end gap-4 rounded-xl border border-line bg-sand/30 p-4">
              <label className="text-xs text-muted">
                Cantidad de personal
                <input
                  type="number"
                  min={MIN_STAFF}
                  max={MAX_STAFF}
                  className="mt-1 w-28 rounded-lg border border-line px-3 py-2 text-lg font-bold text-navy"
                  value={staffCount}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (!Number.isFinite(n)) return
                    setStaffCount(Math.min(MAX_STAFF, Math.max(MIN_STAFF, n)))
                  }}
                />
              </label>
              <input
                type="range"
                min={MIN_STAFF}
                max={MAX_STAFF}
                value={staffCount}
                onChange={(e) => setStaffCount(Number(e.target.value))}
                className="min-w-[180px] flex-1 accent-teal"
              />
              <div className="rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white">
                {staffCount}{' '}
                {serviceType === 'medico' ? 'especialista(s)' : 'persona(s)'}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 3, 5, 8, 10, 12, 15, 20].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStaffCount(n)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    staffCount === n
                      ? 'border-navy bg-navy text-white'
                      : 'border-line bg-white text-muted hover:border-teal'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            {libraryCount > 0 && (
              <label className="mt-3 flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={useLibrary}
                  onChange={(e) => setUseLibrary(e.target.checked)}
                />
                Usar personal guardado de este servicio ({libraryCount} en
                biblioteca) y completar hasta {staffCount}
              </label>
            )}
            <label className="mt-2 flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={copyPrevStaff}
                onChange={(e) => setCopyPrevStaff(e.target.checked)}
              />
              Traer nombres del mes anterior (mismo servicio), si existe
            </label>
          </section>
        </div>

        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-line bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-sand"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canCreate || creating}
            onClick={() => void handleCreate()}
            className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40"
          >
            {creating
              ? 'Creando…'
              : `Crear horario · ${SERVICE_LABEL[serviceType]} · ${resolvedUnit || '…'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
