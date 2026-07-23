import type { ScheduleDoc, ScheduleCell, StaffMember } from '../types'
import { uid } from '../types'
import { daysInMonth, isWeekend } from './calendar'
import { holidayDatesInMonth } from './holidays'
import { loadSchedule, listSavedSchedules } from './storage'
import { isRemoteEnabled, listRemoteSchedules, fetchRemoteSchedule } from './api'

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

function mapCellsFromSource(
  doc: ScheduleDoc,
  source: ScheduleDoc,
): ScheduleCell {
  const destDays = daysInMonth(doc.year, doc.month)
  const srcDays = daysInMonth(source.year, source.month)
  const cells: ScheduleCell = {}
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
  return cells
}

async function findPreviousSchedule(
  doc: ScheduleDoc,
): Promise<ScheduleDoc | null> {
  const prevMonth = doc.month === 1 ? 12 : doc.month - 1
  const prevYear = doc.month === 1 ? doc.year - 1 : doc.year

  const localHit = listSavedSchedules().find(
    (s) =>
      s.serviceType === doc.serviceType &&
      s.unitName === doc.unitName &&
      s.month === prevMonth &&
      s.year === prevYear,
  )
  if (localHit) {
    const loaded = loadSchedule(localHit.id)
    if (loaded) return loaded
  }

  if (isRemoteEnabled()) {
    try {
      const remote = await listRemoteSchedules()
      const hit = remote.find(
        (s) =>
          s.serviceType === doc.serviceType &&
          s.unitName === doc.unitName &&
          s.month === prevMonth &&
          s.year === prevYear,
      )
      if (hit) return await fetchRemoteSchedule(hit.id)
    } catch {
      // ignore
    }
  }
  return null
}

/**
 * Duplica celdas del mes anterior (local o Supabase) hacia el mes actual.
 */
export async function duplicatePreviousMonth(
  doc: ScheduleDoc,
): Promise<ScheduleDoc> {
  const prevMonth = doc.month === 1 ? 12 : doc.month - 1
  const prevYear = doc.month === 1 ? doc.year - 1 : doc.year
  const source = await findPreviousSchedule(doc)

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

  // Si el destino no tiene personal nombrado, copiar también el staff
  let staff = doc.staff
  let cells: ScheduleCell
  if (doc.staff.filter((s) => s.name.trim()).length === 0 && source.staff.length > 0) {
    staff = cloneStaffRows(source.staff)
    const temp = { ...doc, staff }
    cells = mapCellsFromSource(temp, source)
  } else {
    cells = mapCellsFromSource(doc, source)
  }

  return {
    ...doc,
    staff,
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

function cloneStaffRows(staff: StaffMember[]): StaffMember[] {
  return staff.map((s, i) => ({
    ...s,
    id: uid(s.fun === 'MED' || s.fun.startsWith('M') ? 'med' : 'enf'),
    order: i + 1,
    horasMedicas: 0,
    horasViolenciaDomestica: 0,
    horasLactancia: 0,
    horasExtras: 0,
  }))
}

/** Copia solo el personal (nombres) del mes anterior. */
export async function copyStaffFromPreviousMonth(
  doc: ScheduleDoc,
): Promise<{ ok: true; staff: StaffMember[] } | { ok: false; error: string }> {
  const source = await findPreviousSchedule(doc)
  if (!source || source.staff.length === 0) {
    return {
      ok: false,
      error: 'No hay personal del mes anterior para este servicio',
    }
  }
  return { ok: true, staff: cloneStaffRows(source.staff) }
}

/** Marca feriados del año/mes con clave F en celdas vacías. */
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

/**
 * Marca sábados y domingos vacíos con clave L (libre).
 * No pisa celdas ya pintadas ni feriados ya marcados.
 */
export function fillEmptyWeekendsWithLibre(doc: ScheduleDoc): ScheduleDoc {
  const days = daysInMonth(doc.year, doc.month)
  const cells = { ...doc.cells }
  let painted = 0
  for (const s of doc.staff) {
    if (!s.name.trim()) continue
    for (let d = 1; d <= days; d++) {
      if (!isWeekend(doc.year, doc.month, d)) continue
      const key = `${s.id}:${d}`
      if (cells[key]) continue
      cells[key] = 'L'
      painted += 1
    }
  }
  if (painted === 0) return doc
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
        action: 'llenar_fines_semana',
        detail: `${painted} celdas L en sáb/dom`,
      },
    ],
  }
}

/** Rellena una fila completa (celdas vacías) con un código. */
export function fillStaffEmptyDays(
  doc: ScheduleDoc,
  staffId: string,
  code: string,
): ScheduleDoc {
  if (!code.trim()) return doc
  const days = daysInMonth(doc.year, doc.month)
  const cells = { ...doc.cells }
  let painted = 0
  for (let d = 1; d <= days; d++) {
    const key = `${staffId}:${d}`
    if (cells[key]) continue
    cells[key] = code
    painted += 1
  }
  if (painted === 0) return doc
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
        action: 'llenar_fila',
        detail: `staff=${staffId} code=${code} celdas=${painted}`,
      },
    ],
  }
}
