import { cellKey } from './calendar'
import { hoursForCode, shiftMeta } from '../data/templates'
import {
  LEAVE_KIND_LABEL,
  type StaffLeave,
  activeLeavesForSchedule,
  leaveDaysInMonth,
} from './leavesStore'
import type { ScheduleDoc } from '../types'
import type { ValidationAlert } from './validation'

export type LeaveUsage = {
  leave: StaffLeave
  /** Días del permiso dentro del mes del horario. */
  daysInMonth: number[]
  /** Días con la clave de ausencia correcta. */
  markedDays: number[]
  /** Días del permiso aún vacíos en planilla. */
  unmarkedDays: number[]
  /** Días con turno productivo pese al permiso. */
  conflictDays: number[]
  /** Días con otra clave (no la del permiso ni productiva). */
  otherCodeDays: Array<{ day: number; code: string }>
  usedHours: number
  authorizedHours: number
  remainingHours: number
  /** true si usedHours > authorizedHours */
  overQuota: boolean
}

/** Compara un permiso activo contra las celdas del horario del mes. */
export function computeLeaveUsage(
  leave: StaffLeave,
  doc: ScheduleDoc,
): LeaveUsage {
  const daysInMonth = leaveDaysInMonth(leave, doc.year, doc.month)
  const markedDays: number[] = []
  const unmarkedDays: number[] = []
  const conflictDays: number[] = []
  const otherCodeDays: Array<{ day: number; code: string }> = []
  const target = leave.absenceCode.toUpperCase()

  for (const day of daysInMonth) {
    const code = doc.cells[cellKey(leave.staffId, day)]
    if (!code) {
      unmarkedDays.push(day)
      continue
    }
    const upper = code.toUpperCase()
    if (upper === target) {
      markedDays.push(day)
      continue
    }
    const meta = shiftMeta(doc.serviceType, code)
    const productive =
      hoursForCode(doc.serviceType, code) > 0 && meta?.group !== 'ausencia'
    if (productive) {
      conflictDays.push(day)
    } else {
      otherCodeDays.push({ day, code })
    }
  }

  const usedHours = markedDays.length * leave.hoursPerDay
  const authorizedHours = leave.authorizedHours
  const remainingHours = Math.max(0, authorizedHours - usedHours)

  return {
    leave,
    daysInMonth,
    markedDays,
    unmarkedDays,
    conflictDays,
    otherCodeDays,
    usedHours,
    authorizedHours,
    remainingHours,
    overQuota: usedHours > authorizedHours + 0.01,
  }
}

export function listLeaveUsagesForDoc(doc: ScheduleDoc): LeaveUsage[] {
  const leaves = activeLeavesForSchedule({
    serviceType: doc.serviceType,
    unitName: doc.unitName,
    year: doc.year,
    month: doc.month,
    staffIds: doc.staff.map((s) => s.id),
  })
  // También empareja por nombre si el id de biblioteca no coincide con el del horario
  const byName = activeLeavesForSchedule({
    serviceType: doc.serviceType,
    unitName: doc.unitName,
    year: doc.year,
    month: doc.month,
  }).filter((l) => !leaves.some((x) => x.id === l.id))

  const nameMap = new Map(
    doc.staff
      .filter((s) => s.name.trim())
      .map((s) => [normalizeName(s.name), s.id]),
  )

  const remapped: StaffLeave[] = []
  for (const l of byName) {
    const sid = nameMap.get(normalizeName(l.staffName))
    if (sid && sid !== l.staffId) {
      remapped.push({ ...l, staffId: sid })
    } else if (sid) {
      remapped.push(l)
    }
  }

  const all = [...leaves, ...remapped]
  const seen = new Set<string>()
  const unique: StaffLeave[] = []
  for (const l of all) {
    const key = `${l.id}:${l.staffId}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(l)
  }

  return unique.map((l) => computeLeaveUsage(l, doc))
}

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

/**
 * Alertas: turno en días de permiso, exceso de horas de vacaciones/permiso,
 * y aviso si falta marcar días autorizados.
 */
export function validateLeaves(doc: ScheduleDoc): ValidationAlert[] {
  const alerts: ValidationAlert[] = []
  const usages = listLeaveUsagesForDoc(doc)

  for (const u of usages) {
    const kind = LEAVE_KIND_LABEL[u.leave.kind]
    const who = u.leave.staffName

    for (const day of u.conflictDays) {
      const code = doc.cells[cellKey(u.leave.staffId, day)]
      alerts.push({
        level: 'error',
        code: 'permiso_conflicto_turno',
        message: `${who}: tiene ${kind.toLowerCase()} (${u.leave.startDate} → ${u.leave.endDate}) pero el día ${day} está con turno ${code}. Debe usar ${u.leave.absenceCode} o libre.`,
        day,
        staffId: u.leave.staffId,
      })
    }

    if (u.overQuota) {
      alerts.push({
        level: 'error',
        code: 'permiso_exceso_horas',
        message: `${who}: ${kind.toLowerCase()} — ${u.usedHours} h marcadas (${u.markedDays.length} día(s) × ${u.leave.hoursPerDay} h) supera las ${u.authorizedHours} h autorizadas.`,
        staffId: u.leave.staffId,
      })
    } else if (
      u.usedHours > 0 &&
      u.authorizedHours > 0 &&
      u.usedHours / u.authorizedHours >= 0.9 &&
      u.remainingHours > 0
    ) {
      alerts.push({
        level: 'warning',
        code: 'permiso_casi_agotado',
        message: `${who}: ${kind.toLowerCase()} casi agotado — quedan ${u.remainingHours} h de ${u.authorizedHours} h autorizadas.`,
        staffId: u.leave.staffId,
      })
    }

    // Vacaciones/permisos con rango en el mes: si hay celdas pintadas del staff, avisar días sin marcar
    const staffHasAnyCell = Object.keys(doc.cells).some((k) =>
      k.startsWith(`${u.leave.staffId}:`),
    )
    if (
      staffHasAnyCell &&
      u.unmarkedDays.length > 0 &&
      u.daysInMonth.length > 0
    ) {
      const sample = u.unmarkedDays.slice(0, 5).join(', ')
      const more =
        u.unmarkedDays.length > 5 ? ` (+${u.unmarkedDays.length - 5})` : ''
      alerts.push({
        level: 'warning',
        code: 'permiso_sin_marcar',
        message: `${who}: ${kind.toLowerCase()} autorizadas — faltan marcar con ${u.leave.absenceCode} el/los día(s) ${sample}${more}. Autorizado: ${u.authorizedHours} h · Usado: ${u.usedHours} h.`,
        staffId: u.leave.staffId,
        day: u.unmarkedDays[0],
      })
    }

    for (const o of u.otherCodeDays.slice(0, 3)) {
      alerts.push({
        level: 'info',
        code: 'permiso_otra_clave',
        message: `${who}: día ${o.day} en permiso con clave ${o.code} (esperada ${u.leave.absenceCode}).`,
        day: o.day,
        staffId: u.leave.staffId,
      })
    }
  }

  return alerts
}

/** Resumen corto para toasts / campana. */
export function leaveUsageSummary(u: LeaveUsage): string {
  const kind = LEAVE_KIND_LABEL[u.leave.kind]
  return `${u.leave.staffName} · ${kind}: ${u.usedHours}/${u.authorizedHours} h · resto ${u.remainingHours} h`
}

/** Rellena celdas vacías de días de permiso con la clave autorizada. */
export function applyLeaveCodesToEmpty(doc: ScheduleDoc): {
  doc: ScheduleDoc
  painted: number
} {
  const usages = listLeaveUsagesForDoc(doc)
  const cells = { ...doc.cells }
  let painted = 0
  for (const u of usages) {
    for (const day of u.unmarkedDays) {
      const key = cellKey(u.leave.staffId, day)
      if (cells[key]) continue
      cells[key] = u.leave.absenceCode
      painted += 1
    }
  }
  return { doc: { ...doc, cells }, painted }
}
