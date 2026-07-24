import { useEffect, useMemo, useState } from 'react'
import type { AppUser, ServiceType, StaffMember } from '../types'
import { SERVICE_LABEL } from '../data/templates'
import { listUnits } from '../lib/unitsStore'
import { listStaff } from '../lib/staffLibrary'
import {
  LEAVE_HOUR_PRESETS,
  LEAVE_KINDS,
  LEAVE_KIND_LABEL,
  type LeaveKind,
  type StaffLeave,
  cancelLeave,
  defaultAbsenceCode,
  defaultHoursPerDay,
  deleteLeave,
  estimateAuthorizedHours,
  findOverlappingLeaves,
  inclusiveDayCount,
  leavesSummary,
  listLeaves,
  upsertLeave,
} from '../lib/leavesStore'
import { notifyJefeLeaveRegistered, notifyJefeLeaveChanged } from '../lib/notifications'

type Props = {
  user: AppUser
  onFlash: (msg: string) => void
  onNotify?: () => void
  /** Prefill de unidad/servicio (editor del jefe). */
  defaultServiceType?: ServiceType
  defaultUnitName?: string
  /** Personal del horario abierto (además de biblioteca). */
  scheduleStaff?: StaffMember[]
  compact?: boolean
  /**
   * servicio = médico/jefe registra de su unidad
   * talento_humano = validador TH visualiza todo el hospital y puede gestionar
   */
  variant?: 'servicio' | 'talento_humano'
  /** Tras registrar un permiso, aplica las claves V/P/… al horario abierto. */
  onApplyLeaveToSchedule?: () => void
}

type FormState = {
  id?: string
  serviceType: ServiceType
  unitName: string
  staffId: string
  staffName: string
  kind: LeaveKind
  absenceCode: string
  startDate: string
  endDate: string
  hoursPerDay: number
  authorizedHours: number
  autoHours: boolean
  notes: string
}

function emptyForm(
  serviceType: ServiceType,
  unitName: string,
): FormState {
  const start = new Date()
  const y = start.getFullYear()
  const m = String(start.getMonth() + 1).padStart(2, '0')
  const d = String(start.getDate()).padStart(2, '0')
  const ymd = `${y}-${m}-${d}`
  const hoursPerDay = defaultHoursPerDay(serviceType)
  return {
    serviceType,
    unitName,
    staffId: '',
    staffName: '',
    kind: 'vacaciones',
    absenceCode: defaultAbsenceCode('vacaciones', serviceType),
    startDate: ymd,
    endDate: ymd,
    hoursPerDay,
    authorizedHours: estimateAuthorizedHours(ymd, ymd, hoursPerDay),
    autoHours: true,
    notes: '',
  }
}

/**
 * Módulo de vacaciones y permisos temporales.
 * - servicio (médico/jefe): registra los de su especialidad
 * - talento_humano (validador): visualiza y gestiona todos
 */
export function PermisosVacacionesPanel({
  user,
  onFlash,
  onNotify,
  defaultServiceType = 'medico',
  defaultUnitName = '',
  scheduleStaff = [],
  compact = false,
  variant = 'servicio',
  onApplyLeaveToSchedule,
}: Props) {
  const isTH = variant === 'talento_humano'
  const [tick, setTick] = useState(0)
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'activo' | 'all'>('activo')
  /** TH puede ver todas las unidades; servicio queda en su unidad. */
  const [scopeAll, setScopeAll] = useState(isTH)
  const [form, setForm] = useState<FormState>(() =>
    emptyForm(
      defaultServiceType,
      defaultUnitName || listUnits(defaultServiceType)[0] || '',
    ),
  )

  useEffect(() => {
    if (defaultUnitName) {
      setForm((f) => ({
        ...f,
        serviceType: defaultServiceType,
        unitName: defaultUnitName,
      }))
    }
  }, [defaultServiceType, defaultUnitName])

  useEffect(() => {
    setScopeAll(isTH)
  }, [isTH])

  const units = listUnits(form.serviceType)
  const libraryStaff = useMemo(() => {
    void tick
    return form.unitName ? listStaff(form.serviceType, form.unitName) : []
  }, [form.serviceType, form.unitName, tick])

  const staffOptions = useMemo(() => {
    const map = new Map<string, StaffMember>()
    for (const s of libraryStaff) {
      if (s.name.trim()) map.set(s.id, s)
    }
    for (const s of scheduleStaff) {
      if (s.name.trim() && !map.has(s.id)) map.set(s.id, s)
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [libraryStaff, scheduleStaff])

  const leaves = useMemo(() => {
    void tick
    return listLeaves({
      serviceType: scopeAll ? undefined : form.serviceType,
      unitName: scopeAll ? undefined : form.unitName || undefined,
      status: statusFilter,
    })
  }, [form.serviceType, form.unitName, statusFilter, scopeAll, tick])

  const summary = useMemo(() => {
    void tick
    return leavesSummary({
      serviceType: scopeAll ? undefined : form.serviceType,
      unitName: scopeAll ? undefined : form.unitName || undefined,
      status: 'all',
    })
  }, [form.serviceType, form.unitName, scopeAll, tick])

  const overlaps = useMemo(
    () =>
      form.staffId || form.staffName.trim()
        ? findOverlappingLeaves({
            id: form.id,
            staffId: form.staffId,
            staffName: form.staffName,
            unitName: form.unitName,
            startDate: form.startDate,
            endDate: form.endDate,
          })
        : [],
    [
      form.id,
      form.staffId,
      form.staffName,
      form.unitName,
      form.startDate,
      form.endDate,
      tick,
    ],
  )

  const visible = leaves.filter((l) => {
    const q = filter.trim().toLowerCase()
    if (!q) return true
    return `${l.staffName} ${l.kind} ${l.absenceCode} ${l.notes} ${l.unitName} ${l.serviceType}`
      .toLowerCase()
      .includes(q)
  })

  function refresh() {
    setTick((n) => n + 1)
  }

  function setKind(kind: LeaveKind) {
    setForm((f) => ({
      ...f,
      kind,
      absenceCode: defaultAbsenceCode(kind, f.serviceType),
    }))
  }

  function syncAutoHours(next: Partial<FormState>, base = form) {
    const merged = { ...base, ...next }
    if (!merged.autoHours) return merged
    return {
      ...merged,
      authorizedHours: estimateAuthorizedHours(
        merged.startDate,
        merged.endDate,
        merged.hoursPerDay,
      ),
    }
  }

  function pickStaff(id: string) {
    const s = staffOptions.find((x) => x.id === id)
    setForm((f) => {
      const hoursPerDay = defaultHoursPerDay(
        f.serviceType,
        s?.codigoPersonal,
      )
      return syncAutoHours(
        {
          staffId: id,
          staffName: s?.name ?? '',
          hoursPerDay,
        },
        f,
      )
    })
  }

  function startCreate() {
    setForm(
      emptyForm(
        form.serviceType,
        form.unitName || units[0] || '',
      ),
    )
  }

  function startEdit(l: StaffLeave) {
    setForm({
      id: l.id,
      serviceType: l.serviceType,
      unitName: l.unitName,
      staffId: l.staffId,
      staffName: l.staffName,
      kind: l.kind,
      absenceCode: l.absenceCode,
      startDate: l.startDate,
      endDate: l.endDate,
      hoursPerDay: l.hoursPerDay,
      authorizedHours: l.authorizedHours,
      autoHours: false,
      notes: l.notes,
    })
  }

  function save() {
    try {
      if (overlaps.length > 0) {
        const tip = overlaps
          .map(
            (o) =>
              `${o.staffName} ${o.startDate}→${o.endDate} (${LEAVE_KIND_LABEL[o.kind]})`,
          )
          .join('; ')
        if (
          !window.confirm(
            `Hay solape con permiso(s) activo(s):\n${tip}\n\n¿Registrar de todos modos?`,
          )
        ) {
          return
        }
      }
      const saved = upsertLeave(
        {
          id: form.id,
          staffId: form.staffId,
          staffName: form.staffName,
          serviceType: form.serviceType,
          unitName: form.unitName,
          kind: form.kind,
          absenceCode: form.absenceCode,
          startDate: form.startDate,
          endDate: form.endDate,
          authorizedHours: form.authorizedHours,
          hoursPerDay: form.hoursPerDay,
          notes: form.notes,
          status: 'activo',
        },
        user,
      )
      if (!form.id) {
        notifyJefeLeaveRegistered({
          unitName: saved.unitName,
          staffName: saved.staffName,
          kindLabel: LEAVE_KIND_LABEL[saved.kind],
          startDate: saved.startDate,
          endDate: saved.endDate,
          authorizedHours: saved.authorizedHours,
          absenceCode: saved.absenceCode,
          registeredBy: user.name,
        })
        onNotify?.()
      }
      onFlash(
        form.id
          ? 'Permiso actualizado'
          : `${LEAVE_KIND_LABEL[saved.kind]} registradas · aviso al jefe`,
      )
      onApplyLeaveToSchedule?.()
      if (form.id) {
        notifyJefeLeaveChanged({
          unitName: saved.unitName,
          staffName: saved.staffName,
          kindLabel: LEAVE_KIND_LABEL[saved.kind],
          action: 'actualizado',
          by: user.name,
        })
        onNotify?.()
      }
      startCreate()
      refresh()
    } catch (e) {
      onFlash(e instanceof Error ? e.message : 'No se pudo guardar')
    }
  }

  function remove(l: StaffLeave) {
    if (!window.confirm(`¿Eliminar ${LEAVE_KIND_LABEL[l.kind]} de ${l.staffName}?`))
      return
    deleteLeave(l.id)
    notifyJefeLeaveChanged({
      unitName: l.unitName,
      staffName: l.staffName,
      kindLabel: LEAVE_KIND_LABEL[l.kind],
      action: 'eliminado',
      by: user.name,
    })
    onNotify?.()
    if (form.id === l.id) startCreate()
    refresh()
    onFlash('Registro eliminado · aviso al jefe')
  }

  function softCancel(l: StaffLeave) {
    cancelLeave(l.id)
    notifyJefeLeaveChanged({
      unitName: l.unitName,
      staffName: l.staffName,
      kindLabel: LEAVE_KIND_LABEL[l.kind],
      action: 'cancelado',
      by: user.name,
    })
    onNotify?.()
    refresh()
    onFlash('Permiso cancelado · aviso al jefe')
  }

  const days = inclusiveDayCount(form.startDate, form.endDate)

  return (
    <div className="space-y-4">
      <div
        className={`rounded-2xl border px-4 py-3 ${
          isTH
            ? 'border-teal/30 bg-teal/5'
            : 'border-navy/20 bg-navy/5'
        }`}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          {isTH ? 'Talento Humano' : 'Jefe / médico de servicio'}
        </p>
        <p className="text-sm text-ink">
          {isTH
            ? 'Visualice todos los permisos y vacaciones registrados por los servicios. Puede corregir o completar registros institucionales. Las horas/día siguen el turno del personal (hasta 24 h).'
            : 'Registre aquí las vacaciones y permisos temporales de su personal. Al elegir a alguien se cargan las horas de su clave (8, 12, 13 o 24 h). Talento Humano también los visualizará.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Activos', value: String(summary.activos) },
          { label: 'Vacaciones', value: String(summary.vacaciones) },
          { label: 'Permisos', value: String(summary.permisos) },
          {
            label: 'Horas autorizadas',
            value: `${summary.horasAutorizadas} h`,
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-line bg-gradient-to-b from-white to-sand/30 px-3 py-2.5 shadow-sm"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
              {k.label}
            </p>
            <p className="font-display text-2xl text-navy">{k.value}</p>
          </div>
        ))}
      </div>

    <section
      className={`grid gap-4 ${compact ? '' : 'lg:grid-cols-[1fr_1.15fr]'}`}
    >
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              {isTH ? 'Gestión institucional' : 'Registro del servicio'}
            </p>
            <h2 className="font-display text-xl text-navy">
              {form.id
                ? 'Editar permiso / vacaciones'
                : isTH
                  ? 'Registrar o completar permiso'
                  : 'Nuevo permiso / vacaciones'}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {isTH
                ? 'Puede filtrar por unidad o ver todo el hospital.'
                : 'Las horas marcadas en planilla se comparan con las autorizadas.'}
            </p>
          </div>
          {form.id ? (
            <button
              type="button"
              onClick={startCreate}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold"
            >
              Nuevo
            </button>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-muted">
            Servicio
            <select
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm text-ink"
              value={form.serviceType}
              onChange={(e) => {
                const serviceType = e.target.value as ServiceType
                const unitName = listUnits(serviceType)[0] ?? ''
                setForm((f) => {
                  const hoursPerDay = defaultHoursPerDay(serviceType)
                  return syncAutoHours(
                    {
                      serviceType,
                      unitName,
                      staffId: '',
                      staffName: '',
                      absenceCode: defaultAbsenceCode(f.kind, serviceType),
                      hoursPerDay,
                    },
                    f,
                  )
                })
              }}
            >
              <option value="medico">{SERVICE_LABEL.medico}</option>
              <option value="enfermeria">{SERVICE_LABEL.enfermeria}</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted">
            Especialidad / unidad
            <select
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm text-ink"
              value={form.unitName}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  unitName: e.target.value,
                  staffId: '',
                  staffName: '',
                }))
              }
            >
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted sm:col-span-2">
            Personal
            <select
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm text-ink"
              value={form.staffId}
              onChange={(e) => pickStaff(e.target.value)}
            >
              <option value="">Seleccione…</option>
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.codigoPersonal
                    ? ` · ${s.codigoPersonal} (${defaultHoursPerDay(form.serviceType, s.codigoPersonal)} h)`
                    : s.fun
                      ? ` · ${s.fun}`
                      : ''}
                </option>
              ))}
            </select>
            {staffOptions.length === 0 ? (
              <span className="mt-1 block text-[11px] font-normal text-amber-800">
                No hay personal en biblioteca ni en el horario. Cargue personal
                primero o escriba el nombre abajo.
              </span>
            ) : null}
          </label>
          <label className="block text-xs font-semibold text-muted sm:col-span-2">
            Nombre (si no está en lista)
            <input
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
              value={form.staffName}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  staffName: e.target.value,
                  staffId: f.staffId || `manual-${Date.now().toString(36)}`,
                }))
              }
              placeholder="Apellidos Nombres"
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Tipo
            <select
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm text-ink"
              value={form.kind}
              onChange={(e) => setKind(e.target.value as LeaveKind)}
            >
              {LEAVE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {LEAVE_KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted">
            Clave en planilla
            <input
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm uppercase"
              value={form.absenceCode}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  absenceCode: e.target.value.toUpperCase(),
                }))
              }
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Desde
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
              value={form.startDate}
              onChange={(e) =>
                setForm((f) => syncAutoHours({ startDate: e.target.value }, f))
              }
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Hasta
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
              value={form.endDate}
              onChange={(e) =>
                setForm((f) => syncAutoHours({ endDate: e.target.value }, f))
              }
            />
          </label>
          <div className="block text-xs font-semibold text-muted sm:col-span-2">
            Horas / día (jornada o turno)
            <p className="mt-1 text-[11px] font-normal text-muted">
              Según la clave del personal (CE 8 h, PT 12 h, HE 13 h, X 24 h).
              Los médicos pueden tener turnos de hasta 24 horas.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {LEAVE_HOUR_PRESETS.map((p) => (
                <button
                  key={p.hours}
                  type="button"
                  onClick={() =>
                    setForm((f) =>
                      syncAutoHours({ hoursPerDay: p.hours }, f),
                    )
                  }
                  className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                    form.hoursPerDay === p.hours
                      ? 'border-teal bg-teal/10 text-teal'
                      : 'border-line text-ink hover:border-teal/40'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <label className="mt-2 block text-[11px] font-semibold text-muted">
              Otra cantidad (1–24)
              <input
                type="number"
                min={1}
                max={24}
                step={1}
                className="mt-1 w-full max-w-[8rem] rounded-xl border border-line px-3 py-2 text-sm"
                value={form.hoursPerDay}
                onChange={(e) => {
                  const raw = Number(e.target.value)
                  const hoursPerDay =
                    Number.isFinite(raw) && raw > 0
                      ? Math.min(24, raw)
                      : defaultHoursPerDay(form.serviceType)
                  setForm((f) => syncAutoHours({ hoursPerDay }, f))
                }}
              />
            </label>
          </div>
          <label className="block text-xs font-semibold text-muted">
            Horas autorizadas
            <input
              type="number"
              min={0}
              step={1}
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
              value={form.authorizedHours}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  autoHours: false,
                  authorizedHours: Number(e.target.value) || 0,
                }))
              }
            />
            <span className="mt-1 flex items-center gap-2 text-[11px] font-normal text-muted">
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={form.autoHours}
                  onChange={(e) =>
                    setForm((f) =>
                      syncAutoHours({ autoHours: e.target.checked }, f),
                    )
                  }
                />
                Calcular = {days} día(s) × {form.hoursPerDay} h
              </label>
            </span>
          </label>
          <label className="block text-xs font-semibold text-muted sm:col-span-2">
            Observación
            <textarea
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Resolución, memo, detalle…"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110"
          >
            {form.id ? 'Guardar cambios' : 'Registrar permiso'}
          </button>
          <button
            type="button"
            onClick={startCreate}
            className="rounded-xl border border-line px-3 py-2 text-sm font-semibold"
          >
            Limpiar
          </button>
        </div>
        {overlaps.length > 0 ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Solape con {overlaps.length} permiso(s) activo(s) del mismo
            personal ({overlaps[0].startDate} → {overlaps[0].endDate}
            {overlaps.length > 1 ? '…' : ''}). Al guardar se pedirá
            confirmación.
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg text-navy">
            {isTH ? 'Permisos del hospital' : 'Registros del servicio'} (
            {visible.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {isTH ? (
              <select
                className="rounded-lg border border-line px-2 py-1.5 text-xs"
                value={scopeAll ? 'all' : 'unit'}
                onChange={(e) => setScopeAll(e.target.value === 'all')}
              >
                <option value="all">Todas las unidades</option>
                <option value="unit">Solo unidad del formulario</option>
              </select>
            ) : null}
            <select
              className="rounded-lg border border-line px-2 py-1.5 text-xs"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'activo' | 'all')
              }
            >
              <option value="activo">Activos</option>
              <option value="all">Todos</option>
            </select>
            <input
              className="w-40 rounded-lg border border-line px-2 py-1.5 text-xs sm:w-52"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={isTH ? 'Buscar nombre, unidad…' : 'Buscar…'}
            />
          </div>
        </div>

        <ul className="max-h-[36rem] space-y-2 overflow-y-auto">
          {visible.map((l) => (
            <li
              key={l.id}
              className="rounded-xl border border-line bg-gradient-to-b from-white to-sand/20 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-navy">{l.staffName}</p>
                  <p className="text-[11px] text-muted">
                    {LEAVE_KIND_LABEL[l.kind]} · clave{' '}
                    <strong className="text-teal">{l.absenceCode}</strong> ·{' '}
                    {l.startDate} → {l.endDate}
                  </p>
                  <p className="mt-0.5 text-xs text-ink">
                    <strong>{l.authorizedHours} h</strong> autorizadas (
                    {l.hoursPerDay} h/día) ·{' '}
                    {l.serviceType === 'medico' ? 'Médico' : 'Enf.'} ·{' '}
                    {l.unitName}
                    {l.status === 'cancelado' ? ' · cancelado' : ''}
                    {l.createdByName ? ` · por ${l.createdByName}` : ''}
                  </p>
                  {l.notes ? (
                    <p className="mt-1 text-[11px] text-muted">{l.notes}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(l)}
                    className="rounded-md border border-line px-2 py-1 text-[10px] font-semibold"
                  >
                    Editar
                  </button>
                  {l.status === 'activo' ? (
                    <button
                      type="button"
                      onClick={() => softCancel(l)}
                      className="rounded-md border border-amber-200 px-2 py-1 text-[10px] font-semibold text-amber-900"
                    >
                      Cancelar
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => remove(l)}
                    className="rounded-md border border-rose-200 px-2 py-1 text-[10px] font-semibold text-rose-900"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </li>
          ))}
          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-3 py-8 text-center text-sm text-muted">
              Aún no hay permisos registrados para esta unidad.
            </p>
          ) : null}
        </ul>
      </div>
    </section>
    </div>
  )
}
