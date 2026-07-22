import type { ScheduleDoc, ScheduleCell } from '../types'
import { uid } from '../types'
import { daysInMonth } from './calendar'
import { holidayDatesInMonth } from './holidays'
import { loadSchedule, listSavedSchedules } from './storage'

/** Borra todas las celdas del mes (mantiene personal y metadatos). */
export function clearMonthCells(doc: ScheduleDoc): ScheduleDoc {
  return {
    ...doc,
    cells: {},
    version: doc.version + 1,
    updatedAt: new Date().toISOString(),
    audit: [
      ...doc.audit,
      {
        id: uid('aud'),
        at: new Date().toISOString(),
        userName: 'Usuario',
        action: 'limpiar_mes',
        detail: `Celdas borradas ${doc.month}/${doc.year}`,
      },
    ],
  }
}

/**
 * Duplica celdas del mes anterior (mismo servicio/unidad) hacia el mes actual.
 * Ajusta días si el mes destino tiene menos días.
 */
export function duplicatePreviousMonth(doc: ScheduleDoc): ScheduleDoc {
  const prevMonth = doc.month === 1 ? 12 : doc.month - 1
  const prevYear = doc.month === 1 ? doc.year - 1 : doc.year

  const saved = listSavedSchedules().find(
    (s) =>
      s.serviceType === doc.serviceType &&
      s.unitName === doc.unitName &&
      s.month === prevMonth &&
      s.year === prevYear,
  )

  let source: ScheduleDoc | null = saved ? loadSchedule(saved.id) : null

  // Si el horario actual es continuación, también aceptar celdas ya cargadas
  // buscando por id distinto en storage; si no hay, devolver doc sin cambios marcados.
  if (!source) {
    return {
      ...doc,
      audit: [
        ...doc.audit,
        {
          id: uid('aud'),
          at: new Date().toISOString(),
          userName: 'Usuario',
          action: 'duplicar_mes_fallido',
          detail: `No se encontró horario ${prevMonth}/${prevYear} para ${doc.unitName}`,
        },
      ],
    }
  }

  const destDays = daysInMonth(doc.year, doc.month)
  const srcDays = daysInMonth(source.year, source.month)
  const cells: ScheduleCell = {}

  // Mapear por nombre+fun si los IDs difieren
  const srcByKey = new Map(
    source.staff.map((s) => [`${s.fun}|${s.name}`.toLowerCase(), s]),
  )

  for (const dest of doc.staff) {
    const src =
      source.staff.find((s) => s.id === dest.id) ??
      srcByKey.get(`${dest.fun}|${dest.name}`.toLowerCase())
    if (!src) continue
    for (let d = 1; d <= Math.min(destDays, srcDays); d++) {
      const code = source.cells[`${src.id}:${d}`]
      if (code) cells[`${dest.id}:${d}`] = code
    }
  }

  return {
    ...doc,
    cells,
    version: doc.version + 1,
    updatedAt: new Date().toISOString(),
    audit: [
      ...doc.audit,
      {
        id: uid('aud'),
        at: new Date().toISOString(),
        userName: 'Usuario',
        action: 'duplicar_mes',
        detail: `Copiado desde ${prevMonth}/${prevYear}`,
      },
    ],
  }
}

/** Marca feriados del año/mes con clave F en celdas vacías (opcional por staff). */
export function applyHolidaysToEmptyCells(
  doc: ScheduleDoc,
  staffIds?: string[],
): ScheduleDoc {
  const holidays = holidayDatesInMonth(doc.year, doc.month)
  if (holidays.size === 0) return doc
  const targets = staffIds ?? doc.staff.map((s) => s.id)
  const cells = { ...doc.cells }
  for (const id of targets) {
    for (const day of holidays) {
      const key = `${id}:${day}`
      if (!cells[key]) cells[key] = 'F'
    }
  }
  return {
    ...doc,
    cells,
    version: doc.version + 1,
    updatedAt: new Date().toISOString(),
    audit: [
      ...doc.audit,
      {
        id: uid('aud'),
        at: new Date().toISOString(),
        userName: 'Usuario',
        action: 'aplicar_feriados',
        detail: `${holidays.size} días feriado marcados`,
      },
    ],
  }
}
