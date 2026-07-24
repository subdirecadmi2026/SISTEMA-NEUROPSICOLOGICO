import type { ScheduleDoc, UserRole } from '../types'
import { cellKey, coverageByDay, daysInMonth } from './calendar'
import { hoursForCode, shiftMeta } from '../data/templates'
import { validateLeaves } from './leaveValidation'

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
    // Días sin nadie pintado: normales en turnos rotativos / 24 h — no alertar
    if (c.count === 0 && c.hours === 0) continue

    // Solo aviso si el día ya tiene actividad pero queda bajo el umbral
    if (c.count < doc.coverageRule.minStaffPerDay) {
      alerts.push({
        level: 'warning',
        code: 'cobertura_baja',
        message: `Día ${c.day}: cobertura ${c.count} (mín. sugerido ${doc.coverageRule.minStaffPerDay})`,
        day: c.day,
      })
    }
    if (c.hours < doc.coverageRule.minHoursPerDay) {
      alerts.push({
        level: 'warning',
        code: 'horas_bajas',
        message: `Día ${c.day}: ${c.hours} h cubiertas (mín. sugerido ${doc.coverageRule.minHoursPerDay} h)`,
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
    // Aviso, no bloquea envío: el revisor puede pedirlo si falta
    alerts.push({
      level: 'warning',
      code: 'contingencia_requerida',
      message:
        'Hay vacaciones/permisos: se recomienda completar el plan de contingencia.',
    })
  }
  return alerts
}

/** Errores que sí bloquean el envío (hoy: ninguno de cobertura). */
export function blockingValidationErrors(
  doc: ScheduleDoc,
): ValidationAlert[] {
  return runAllValidations(doc).filter((a) => a.level === 'error')
}

export function runAllValidations(doc: ScheduleDoc): ValidationAlert[] {
  return [
    ...validateCoverage(doc),
    ...validateRestDays(doc),
    ...validatePostGuard(doc),
    ...validateContingency(doc),
    ...validateLeaves(doc),
  ]
}

export type ChecklistItem = {
  id: string
  ok: boolean
  level: 'required' | 'recommended'
  message: string
}

/** Checklist previo a enviar a revisión.
 * Suficiente con nombres + jefe + algo pintado (turnos rotativos / 24 h no exigen mes lleno).
 */
export function getSubmissionChecklist(doc: ScheduleDoc): ChecklistItem[] {
  const named = doc.staff.filter((s) => s.name.trim())
  const days = daysInMonth(doc.year, doc.month)
  let empty = 0
  for (const s of named) {
    for (let d = 1; d <= days; d++) {
      if (!doc.cells[cellKey(s.id, d)]) empty += 1
    }
  }
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
          ? `${painted} celda(s) con clave — listo para enviar`
          : 'Aún no hay turnos pintados',
    },
    {
      id: 'vacios',
      ok: empty === 0 && named.length > 0,
      level: 'recommended',
      message:
        empty === 0 && named.length > 0
          ? 'Mes completo (sin celdas vacías)'
          : `${empty} celdas vacías (normal en turnos rotativos / 24 h)`,
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
