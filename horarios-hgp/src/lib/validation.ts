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
  if (!role) return false
  if (role === 'admin') return true
  // Solo el jefe edita celdas/personal, y únicamente en borrador
  if (status === 'BORRADOR') return role === 'lider_servicio'
  // Revisor y validador: solo visualización (acciones de flujo aparte)
  return false
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

export type ChecklistItem = {
  id: string
  ok: boolean
  level: 'required' | 'recommended'
  message: string
}

/** Checklist previo a enviar a revisión. */
export function getSubmissionChecklist(doc: ScheduleDoc): ChecklistItem[] {
  const named = doc.staff.filter((s) => s.name.trim())
  const days = daysInMonth(doc.year, doc.month)
  let empty = 0
  for (const s of named) {
    for (let d = 1; d <= days; d++) {
      if (!doc.cells[cellKey(s.id, d)]) empty += 1
    }
  }
  const alerts = runAllValidations(doc)
  const errors = alerts.filter((a) => a.level === 'error')
  const warnings = alerts.filter((a) => a.level === 'warning')
  const painted = Object.keys(doc.cells).length

  return [
    {
      id: 'nombres',
      ok: named.length >= 1,
      level: 'required',
      message:
        named.length >= 1
          ? `${named.length} persona(s) con nombre`
          : 'Falta al menos 1 nombre de personal',
    },
    {
      id: 'jefe',
      ok: doc.jefeServicio.trim().length > 0,
      level: 'required',
      message: doc.jefeServicio.trim()
        ? `Jefe/líder: ${doc.jefeServicio}`
        : 'Indique el jefe / líder de servicio',
    },
    {
      id: 'pintado',
      ok: painted > 0,
      level: 'required',
      message:
        painted > 0
          ? `${painted} celdas con clave`
          : 'Aún no hay turnos pintados',
    },
    {
      id: 'vacios',
      ok: empty === 0 && named.length > 0,
      level: 'recommended',
      message:
        empty === 0 && named.length > 0
          ? 'Mes completo (sin celdas vacías)'
          : `${empty} celdas vacías en personal con nombre`,
    },
    {
      id: 'errores',
      ok: errors.length === 0,
      level: 'required',
      message:
        errors.length === 0
          ? 'Sin errores de validación'
          : `${errors.length} error(es) por corregir antes de enviar`,
    },
    {
      id: 'avisos',
      ok: warnings.length === 0,
      level: 'recommended',
      message:
        warnings.length === 0
          ? 'Sin avisos de cobertura/descansos'
          : `${warnings.length} aviso(s) (puede enviar, pero revise)`,
    },
  ]
}

export function isReadyToSubmit(doc: ScheduleDoc): boolean {
  return getSubmissionChecklist(doc)
    .filter((i) => i.level === 'required')
    .every((i) => i.ok)
}

export function isProductiveCode(
  serviceType: ScheduleDoc['serviceType'],
  code: string,
): boolean {
  const meta = shiftMeta(serviceType, code)
  return !!meta && meta.hours > 0 && meta.group !== 'ausencia'
}
