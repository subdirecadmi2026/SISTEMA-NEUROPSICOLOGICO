import { WEEKDAYS_ES } from '../types'
import type { ScheduleDoc, StaffMember } from '../types'
import { hoursForCode } from '../data/templates'

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function weekdayIndex(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay()
}

export function weekdayLetter(year: number, month: number, day: number): string {
  return WEEKDAYS_ES[weekdayIndex(year, month, day)]
}

export function isWeekend(year: number, month: number, day: number): boolean {
  const w = weekdayIndex(year, month, day)
  return w === 0 || w === 6
}

export function cellKey(staffId: string, day: number): string {
  return `${staffId}:${day}`
}

export function plannedShifts(doc: ScheduleDoc, staffId: string): number {
  const days = daysInMonth(doc.year, doc.month)
  let n = 0
  for (let d = 1; d <= days; d++) {
    const code = doc.cells[cellKey(staffId, d)]
    if (code && hoursForCode(doc.serviceType, code) > 0) n += 1
  }
  return n
}

export function plannedHours(doc: ScheduleDoc, staffId: string): number {
  const days = daysInMonth(doc.year, doc.month)
  let h = 0
  for (let d = 1; d <= days; d++) {
    const code = doc.cells[cellKey(staffId, d)]
    if (code) h += hoursForCode(doc.serviceType, code)
  }
  return h
}

export function countCodeForStaff(
  doc: ScheduleDoc,
  staffId: string,
  code: string,
): number {
  const days = daysInMonth(doc.year, doc.month)
  let n = 0
  for (let d = 1; d <= days; d++) {
    if (doc.cells[cellKey(staffId, d)] === code) n += 1
  }
  return n
}

/** Total horas pagadas ≈ planificadas + extras − (ajusta lactancia/permisos si aplica). */
export function totalPaidHours(doc: ScheduleDoc, staff: StaffMember): number {
  const planned = plannedHours(doc, staff.id)
  const extras = staff.horasExtras ?? 0
  return planned + extras
}

export function coverageByDay(doc: ScheduleDoc): { day: number; count: number; hours: number }[] {
  const days = daysInMonth(doc.year, doc.month)
  return Array.from({ length: days }, (_, i) => {
    const day = i + 1
    let count = 0
    let hours = 0
    for (const s of doc.staff) {
      const code = doc.cells[cellKey(s.id, day)]
      if (code) {
        const h = hoursForCode(doc.serviceType, code)
        if (h > 0) {
          count += 1
          hours += h
        }
      }
    }
    return { day, count, hours }
  })
}
