import type { ScheduleDoc, UserRole } from '../types'
import { cellKey, coverageByDay, daysInMonth } from './calendar'
import { hoursForCode, shiftMeta } from '../data/templates'

export type ValidationAlert = {
  level: 'error' | 'warning' | 'info'
  code: string
  message: string
  day?: number
  staffId?: string
}

/** Roles que pueden editar un horario según estado. */
export function canEditSchedule(
  status: ScheduleDoc['status'],
  role: UserRole | null,
): boolean {
  if (!role) return status === 'BORRADOR'
  if (role === 'admin') return true
  if (status === 'APROBADO' || status === 'ARCHIVADO') return false
  if (status === 'EN_REVISION') {
    return (
      role === 'gestion_enfermeria' ||
      role === 'subdireccion' ||
      role === 'direccion_asistencial' ||
      role === 'talento_humano'
    )
  }
  // BORRADOR
  return role === 'lider_servicio'
}

export function validateCoverage(doc: ScheduleDoc): ValidationAlert[] {
  const alerts: ValidationAlert[] = []
  const cov = coverageByDay(doc)
  for (const c of cov) {
    if (c.count < doc.coverageRule.minStaffPerDay) {
      alerts.push({
        level: c.count === 0 ? 'error' : 'warning',
        code: 'cobertura_baja',
        message: `Día ${c.day}: cobertura ${c.count} (mín. ${doc.coverageRule.minStaffPerDay})`,
        day: c.day,
      })
    }
    if (c.hours < doc.coverageRule.minHoursPerDay) {
      alerts.push({
        level: 'warning',
        code: 'horas_bajas',
        message: `Día ${c.day}: ${c.hours} h cubiertas (mín. ${doc.coverageRule.minHoursPerDay} h)`,
        day: c.day,
      })
    }
  }
  return alerts
}

/** No más de `maxConsecutive` días productivos seguidos sin L/ausencia. */
export function validateRestDays(
  doc: ScheduleDoc,
  maxConsecutive = 6,
): ValidationAlert[] {
  const alerts: ValidationAlert[] = []
  const days = daysInMonth(doc.year, doc.month)
  for (const s of doc.staff) {
    let streak = 0
    for (let d = 1; d <= days; d++) {
      const code = doc.cells[cellKey(s.id, d)]
      const productive = code ? hoursForCode(doc.serviceType, code) > 0 : false
      if (productive) {
        streak += 1
        if (streak > maxConsecutive) {
          alerts.push({
            level: 'warning',
            code: 'sin_descanso',
            message: `${s.name}: más de ${maxConsecutive} días seguidos sin descanso (día ${d})`,
            day: d,
            staffId: s.id,
          })
        }
      } else {
        streak = 0
      }
    }
  }
  return alerts
}

/** Tras guardia médica X/PT2/GD, el día siguiente debería ser L (recomendación). */
export function validatePostGuard(doc: ScheduleDoc): ValidationAlert[] {
  if (doc.serviceType !== 'medico') return []
  const alerts: ValidationAlert[] = []
  const days = daysInMonth(doc.year, doc.month)
  const nightCodes = new Set(['X', 'PT2', 'GD'])
  for (const s of doc.staff) {
    for (let d = 1; d < days; d++) {
      const code = doc.cells[cellKey(s.id, d)]
      if (!code || !nightCodes.has(code)) continue
      const next = doc.cells[cellKey(s.id, d + 1)]
      if (next && hoursForCode(doc.serviceType, next) > 0) {
        alerts.push({
          level: 'warning',
          code: 'post_guardia',
          message: `${s.name}: turno productivo el día ${d + 1} tras guardia ${code}`,
          day: d + 1,
          staffId: s.id,
        })
      }
    }
  }
  return alerts
}

export function validateContingency(doc: ScheduleDoc): ValidationAlert[] {
  const alerts: ValidationAlert[] = []
  const hasVacOrPerm = Object.values(doc.cells).some((c) =>
    ['V', 'P', 'INC', 'CD'].includes(c),
  )
  if (
    (doc.vacacionesFlag || hasVacOrPerm) &&
    !doc.contingencyPlan.trim() &&
    doc.serviceType === 'medico'
  ) {
    alerts.push({
      level: 'error',
      code: 'contingencia_requerida',
      message:
        'Hay vacaciones/permisos: el plan de contingencia es obligatorio (plantilla médica).',
    })
  }
  return alerts
}

export function runAllValidations(doc: ScheduleDoc): ValidationAlert[] {
  return [
    ...validateCoverage(doc),
    ...validateRestDays(doc),
    ...validatePostGuard(doc),
    ...validateContingency(doc),
  ]
}

export function isProductiveCode(
  serviceType: ScheduleDoc['serviceType'],
  code: string,
): boolean {
  const meta = shiftMeta(serviceType, code)
  return !!meta && meta.hours > 0 && meta.group !== 'ausencia'
}
