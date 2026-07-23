import type { AppUser, ServiceType } from '../types'
import { uid } from '../types'

const KEY = 'hgp-staff-leaves-v1'

export type LeaveKind =
  | 'vacaciones'
  | 'permiso_temporal'
  | 'permiso_medico'
  | 'calamidad'
  | 'capacitacion'
  | 'otro'

export type LeaveStatus = 'activo' | 'cancelado'

export type StaffLeave = {
  id: string
  staffId: string
  staffName: string
  serviceType: ServiceType
  unitName: string
  kind: LeaveKind
  /** Código de planilla (V, P, CM, INC…). */
  absenceCode: string
  /** YYYY-MM-DD */
  startDate: string
  /** YYYY-MM-DD */
  endDate: string
  /** Horas autorizadas del permiso / vacaciones. */
  authorizedHours: number
  /** Horas que cuenta cada día marcado en planilla (jornada). */
  hoursPerDay: number
  notes: string
  status: LeaveStatus
  createdAt: string
  updatedAt: string
  createdBy?: string
  createdByName?: string
}

export const LEAVE_KIND_LABEL: Record<LeaveKind, string> = {
  vacaciones: 'Vacaciones',
  permiso_temporal: 'Permiso temporal',
  permiso_medico: 'Permiso / certificado médico',
  calamidad: 'Calamidad doméstica',
  capacitacion: 'Capacitación',
  otro: 'Otro',
}

export const LEAVE_KINDS: LeaveKind[] = [
  'vacaciones',
  'permiso_temporal',
  'permiso_medico',
  'calamidad',
  'capacitacion',
  'otro',
]

const DEFAULT_HOURS_PER_DAY = 8

export function defaultAbsenceCode(
  kind: LeaveKind,
  serviceType: ServiceType,
): string {
  switch (kind) {
    case 'vacaciones':
      return 'V'
    case 'permiso_temporal':
      return 'P'
    case 'permiso_medico':
      return serviceType === 'medico' ? 'INC' : 'CM'
    case 'calamidad':
      return serviceType === 'medico' ? 'CD' : 'CD'
    case 'capacitacion':
      return serviceType === 'medico' ? 'CAP' : 'P'
    default:
      return 'P'
  }
}

/** Estima horas autorizadas = días calendario inclusive × jornada. */
export function estimateAuthorizedHours(
  startDate: string,
  endDate: string,
  hoursPerDay = DEFAULT_HOURS_PER_DAY,
): number {
  const days = inclusiveDayCount(startDate, endDate)
  return Math.max(0, days * hoursPerDay)
}

export function inclusiveDayCount(startDate: string, endDate: string): number {
  const a = parseYmd(startDate)
  const b = parseYmd(endDate)
  if (!a || !b || b.getTime() < a.getTime()) return 0
  const ms = b.getTime() - a.getTime()
  return Math.floor(ms / 86_400_000) + 1
}

export function parseYmd(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (Number.isNaN(d.getTime())) return null
  return d
}

export function formatYmd(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

function readAll(): StaffLeave[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StaffLeave[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(list: StaffLeave[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 2000)))
}

export function listLeaves(opts?: {
  unitName?: string
  serviceType?: ServiceType
  staffId?: string
  status?: LeaveStatus | 'all'
  year?: number
  month?: number
}): StaffLeave[] {
  let list = readAll()
  if (opts?.unitName) {
    list = list.filter((l) => l.unitName === opts.unitName)
  }
  if (opts?.serviceType) {
    list = list.filter((l) => l.serviceType === opts.serviceType)
  }
  if (opts?.staffId) {
    list = list.filter((l) => l.staffId === opts.staffId)
  }
  if (opts?.status && opts.status !== 'all') {
    list = list.filter((l) => l.status === opts.status)
  }
  if (opts?.year != null && opts?.month != null) {
    list = list.filter((l) => leaveOverlapsMonth(l, opts.year!, opts.month!))
  } else if (opts?.year != null) {
    list = list.filter((l) => {
      const s = parseYmd(l.startDate)
      const e = parseYmd(l.endDate)
      if (!s || !e) return false
      return s.getFullYear() === opts.year || e.getFullYear() === opts.year
    })
  }
  return list.sort((a, b) => b.startDate.localeCompare(a.startDate))
}

export function leaveOverlapsMonth(
  leave: StaffLeave,
  year: number,
  month: number,
): boolean {
  const start = parseYmd(leave.startDate)
  const end = parseYmd(leave.endDate)
  if (!start || !end) return false
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0)
  return start.getTime() <= monthEnd.getTime() && end.getTime() >= monthStart.getTime()
}

export function getLeave(id: string): StaffLeave | undefined {
  return readAll().find((l) => l.id === id)
}

export type LeaveInput = {
  staffId: string
  staffName: string
  serviceType: ServiceType
  unitName: string
  kind: LeaveKind
  absenceCode?: string
  startDate: string
  endDate: string
  authorizedHours?: number
  hoursPerDay?: number
  notes?: string
  status?: LeaveStatus
}

function validateInput(input: LeaveInput) {
  if (!input.staffId.trim()) throw new Error('Seleccione el personal')
  if (!input.staffName.trim()) throw new Error('Indique el nombre del personal')
  if (!input.unitName.trim()) throw new Error('Indique la especialidad / unidad')
  const start = parseYmd(input.startDate)
  const end = parseYmd(input.endDate)
  if (!start || !end) throw new Error('Fechas inválidas')
  if (end.getTime() < start.getTime()) {
    throw new Error('La fecha fin no puede ser anterior al inicio')
  }
  const hoursPerDay = input.hoursPerDay ?? DEFAULT_HOURS_PER_DAY
  if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0) {
    throw new Error('Horas por día deben ser mayores a 0')
  }
  const auth =
    input.authorizedHours ??
    estimateAuthorizedHours(input.startDate, input.endDate, hoursPerDay)
  if (!Number.isFinite(auth) || auth < 0) {
    throw new Error('Horas autorizadas inválidas')
  }
  return { start, end, hoursPerDay, auth }
}

export function upsertLeave(
  input: LeaveInput & { id?: string },
  actor?: AppUser | null,
): StaffLeave {
  const { hoursPerDay, auth } = validateInput(input)
  const now = new Date().toISOString()
  const all = readAll()
  const code =
    (input.absenceCode || defaultAbsenceCode(input.kind, input.serviceType))
      .trim()
      .toUpperCase() || defaultAbsenceCode(input.kind, input.serviceType)

  if (input.id) {
    const idx = all.findIndex((l) => l.id === input.id)
    if (idx < 0) throw new Error('Permiso no encontrado')
    const prev = all[idx]
    const next: StaffLeave = {
      ...prev,
      staffId: input.staffId,
      staffName: input.staffName.trim(),
      serviceType: input.serviceType,
      unitName: input.unitName.trim(),
      kind: input.kind,
      absenceCode: code,
      startDate: input.startDate,
      endDate: input.endDate,
      authorizedHours: auth,
      hoursPerDay,
      notes: (input.notes ?? '').trim(),
      status: input.status ?? prev.status,
      updatedAt: now,
    }
    all[idx] = next
    writeAll(all)
    return next
  }

  const created: StaffLeave = {
    id: uid('lv'),
    staffId: input.staffId,
    staffName: input.staffName.trim(),
    serviceType: input.serviceType,
    unitName: input.unitName.trim(),
    kind: input.kind,
    absenceCode: code,
    startDate: input.startDate,
    endDate: input.endDate,
    authorizedHours: auth,
    hoursPerDay,
    notes: (input.notes ?? '').trim(),
    status: input.status ?? 'activo',
    createdAt: now,
    updatedAt: now,
    createdBy: actor?.id,
    createdByName: actor?.name,
  }
  all.unshift(created)
  writeAll(all)
  return created
}

export function cancelLeave(id: string): StaffLeave {
  const all = readAll()
  const idx = all.findIndex((l) => l.id === id)
  if (idx < 0) throw new Error('Permiso no encontrado')
  all[idx] = {
    ...all[idx],
    status: 'cancelado',
    updatedAt: new Date().toISOString(),
  }
  writeAll(all)
  return all[idx]
}

export function deleteLeave(id: string) {
  writeAll(readAll().filter((l) => l.id !== id))
}

/** Detecta solapes de fechas del mismo personal (permisos activos). */
export function findOverlappingLeaves(
  input: Pick<
    LeaveInput,
    'staffId' | 'staffName' | 'startDate' | 'endDate' | 'unitName'
  > & { id?: string },
): StaffLeave[] {
  const start = parseYmd(input.startDate)
  const end = parseYmd(input.endDate)
  if (!start || !end) return []
  const nameKey = input.staffName.trim().toLowerCase()
  return readAll().filter((l) => {
    if (l.status !== 'activo') return false
    if (input.id && l.id === input.id) return false
    if (l.unitName !== input.unitName) return false
    const samePerson =
      l.staffId === input.staffId ||
      l.staffName.trim().toLowerCase() === nameKey
    if (!samePerson) return false
    const a = parseYmd(l.startDate)
    const b = parseYmd(l.endDate)
    if (!a || !b) return false
    return a.getTime() <= end.getTime() && b.getTime() >= start.getTime()
  })
}

export function leavesSummary(opts?: {
  serviceType?: ServiceType
  unitName?: string
  status?: LeaveStatus | 'all'
}): {
  total: number
  activos: number
  vacaciones: number
  permisos: number
  horasAutorizadas: number
} {
  const list = listLeaves({
    serviceType: opts?.serviceType,
    unitName: opts?.unitName,
    status: opts?.status ?? 'all',
  })
  const activos = list.filter((l) => l.status === 'activo')
  return {
    total: list.length,
    activos: activos.length,
    vacaciones: activos.filter((l) => l.kind === 'vacaciones').length,
    permisos: activos.filter((l) => l.kind !== 'vacaciones').length,
    horasAutorizadas: activos.reduce((s, l) => s + l.authorizedHours, 0),
  }
}

/** Días del permiso que caen en un mes concreto (1..31). */
export function leaveDaysInMonth(
  leave: StaffLeave,
  year: number,
  month: number,
): number[] {
  const start = parseYmd(leave.startDate)
  const end = parseYmd(leave.endDate)
  if (!start || !end) return []
  const daysIn = new Date(year, month, 0).getDate()
  const out: number[] = []
  for (let d = 1; d <= daysIn; d++) {
    const cur = new Date(year, month - 1, d)
    if (cur.getTime() >= start.getTime() && cur.getTime() <= end.getTime()) {
      out.push(d)
    }
  }
  return out
}

export function activeLeavesForSchedule(opts: {
  serviceType: ServiceType
  unitName: string
  year: number
  month: number
  staffIds?: string[]
}): StaffLeave[] {
  const set = opts.staffIds ? new Set(opts.staffIds) : null
  return listLeaves({
    serviceType: opts.serviceType,
    unitName: opts.unitName,
    status: 'activo',
    year: opts.year,
    month: opts.month,
  }).filter((l) => (set ? set.has(l.staffId) : true))
}
