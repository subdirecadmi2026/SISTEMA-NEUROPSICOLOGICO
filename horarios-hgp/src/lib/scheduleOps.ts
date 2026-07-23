import type { ScheduleDoc, ScheduleCell, StaffMember } from '../types'
import { uid } from '../types'
import { daysInMonth, isWeekend } from './calendar'
import { holidayDatesInMonth } from './holidays'
import { loadSchedule, listSavedSchedules } from './storage'
import { isRemoteEnabled, listRemoteSchedules, fetchRemoteSchedule } from './api'
import { shiftMeta } from '../data/templates'

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

/** Pinta o borra toda una columna (día) para el personal con nombre. */
export function paintDayColumn(
  doc: ScheduleDoc,
  day: number,
  code: string | null,
): ScheduleDoc {
  const days = daysInMonth(doc.year, doc.month)
  if (day < 1 || day > days) return doc
  const cells = { ...doc.cells }
  let changed = 0
  for (const s of doc.staff) {
    if (!s.name.trim()) continue
    const key = `${s.id}:${day}`
    if (code === null) {
      if (cells[key]) {
        delete cells[key]
        changed += 1
      }
    } else if (cells[key] !== code) {
      cells[key] = code
      changed += 1
    }
  }
  if (changed === 0) return doc
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
        action: code === null ? 'borrar_columna' : 'pintar_columna',
        detail: `día=${day} code=${code ?? '—'} cambios=${changed}`,
      },
    ],
  }
}

/**
 * Copia el patrón de la primera semana (días 1–7) hacia el resto del mes,
 * solo en celdas vacías. Útil para rotativos.
 */
export function copyFirstWeekPattern(doc: ScheduleDoc): ScheduleDoc {
  const days = daysInMonth(doc.year, doc.month)
  if (days <= 7) return doc
  const cells = { ...doc.cells }
  let painted = 0
  for (const s of doc.staff) {
    if (!s.name.trim()) continue
    for (let d = 8; d <= days; d++) {
      const key = `${s.id}:${d}`
      if (cells[key]) continue
      const srcDay = ((d - 1) % 7) + 1
      const src = cells[`${s.id}:${srcDay}`]
      if (!src) continue
      cells[key] = src
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
        action: 'copiar_semana',
        detail: `${painted} celdas desde patrón días 1–7`,
      },
    ],
  }
}

/** Mueve un miembro de personal una posición (arriba/abajo). */
export function moveStaffOrder(
  doc: ScheduleDoc,
  staffId: string,
  direction: -1 | 1,
): ScheduleDoc {
  const sorted = [...doc.staff].sort((a, b) => a.order - b.order)
  const idx = sorted.findIndex((s) => s.id === staffId)
  if (idx < 0) return doc
  const swap = idx + direction
  if (swap < 0 || swap >= sorted.length) return doc
  ;[sorted[idx], sorted[swap]] = [sorted[swap], sorted[idx]]
  const staff = sorted.map((s, i) => ({ ...s, order: i + 1 }))
  return {
    ...doc,
    staff,
    version: doc.version + 1,
    updatedAt: new Date().toISOString(),
  }
}

/** Duplica una fila de personal (sin celdas). */
export function duplicateStaffRow(
  doc: ScheduleDoc,
  staffId: string,
): ScheduleDoc {
  const sorted = [...doc.staff].sort((a, b) => a.order - b.order)
  const src = sorted.find((s) => s.id === staffId)
  if (!src) return doc
  const idx = sorted.findIndex((s) => s.id === staffId)
  const copy: StaffMember = {
    ...src,
    id: uid(src.fun === 'MED' || src.fun.startsWith('M') ? 'med' : 'enf'),
    name: src.name ? `${src.name} (copia)` : '',
    order: idx + 2,
    horasMedicas: 0,
    horasViolenciaDomestica: 0,
    horasLactancia: 0,
    horasExtras: 0,
  }
  const staff = [
    ...sorted.slice(0, idx + 1),
    copy,
    ...sorted.slice(idx + 1),
  ].map((s, i) => ({ ...s, order: i + 1 }))
  return {
    ...doc,
    staff,
    version: doc.version + 1,
    updatedAt: new Date().toISOString(),
    audit: [
      ...doc.audit,
      {
        id: uid('aud'),
        at: new Date().toISOString(),
        userName: 'Usuario',
        action: 'duplicar_personal',
        detail: `Desde ${src.name || staffId}`,
      },
    ],
  }
}

/**
 * Sugiere filas de contingencia a partir de personal con V/P/INC/CD
 * en el mes (no duplica nombres ya listados).
 */
export function suggestContingencyFromAbsences(
  doc: ScheduleDoc,
): ScheduleDoc {
  const absence = new Set(['V', 'P', 'INC', 'CD'])
  const existing = new Set(
    doc.contingencyStaff.map((c) => c.name.trim().toLowerCase()).filter(Boolean),
  )
  const rows = [...doc.contingencyStaff]
  let added = 0
  for (const s of doc.staff) {
    if (!s.name.trim()) continue
    const key = s.name.trim().toLowerCase()
    if (existing.has(key)) continue
    const hasAbs = Object.entries(doc.cells).some(
      ([k, code]) => k.startsWith(`${s.id}:`) && absence.has(code),
    )
    if (!hasAbs) continue
    rows.push({
      id: uid('cont'),
      name: s.name,
      coverage: 'Cobertura por ausencia/vacaciones — definir reemplazo',
      phone: '',
    })
    existing.add(key)
    added += 1
  }
  if (added === 0) return doc
  return {
    ...doc,
    contingencyStaff: rows,
    version: doc.version + 1,
    updatedAt: new Date().toISOString(),
    audit: [
      ...doc.audit,
      {
        id: uid('aud'),
        at: new Date().toISOString(),
        userName: 'Usuario',
        action: 'sugerir_contingencia',
        detail: `${added} filas sugeridas`,
      },
    ],
  }
}

/** Conteo de uso de cada clave en el mes. */
export function countCodesUsed(
  doc: ScheduleDoc,
): Array<{ code: string; count: number }> {
  const map = new Map<string, number>()
  for (const code of Object.values(doc.cells)) {
    if (!code) continue
    map.set(code, (map.get(code) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))
}

/** Borra todas las celdas de una fila de personal. */
export function clearStaffRowCells(
  doc: ScheduleDoc,
  staffId: string,
): ScheduleDoc {
  const cells = { ...doc.cells }
  let removed = 0
  for (const key of Object.keys(cells)) {
    if (key.startsWith(`${staffId}:`)) {
      delete cells[key]
      removed += 1
    }
  }
  if (removed === 0) return doc
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
        action: 'limpiar_fila',
        detail: `staff=${staffId} celdas=${removed}`,
      },
    ],
  }
}

/**
 * Tras guardia médica X / PT2 / GD, marca L el día siguiente si está vacío.
 */
export function applyPostGuardLibre(doc: ScheduleDoc): ScheduleDoc {
  if (doc.serviceType !== 'medico') return doc
  const days = daysInMonth(doc.year, doc.month)
  const night = new Set(['X', 'PT2', 'GD'])
  const cells = { ...doc.cells }
  let painted = 0
  for (const s of doc.staff) {
    if (!s.name.trim()) continue
    for (let d = 1; d < days; d++) {
      const code = cells[`${s.id}:${d}`]
      if (!code || !night.has(code)) continue
      const nextKey = `${s.id}:${d + 1}`
      if (cells[nextKey]) continue
      cells[nextKey] = 'L'
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
        action: 'post_guardia_L',
        detail: `${painted} días L tras guardia`,
      },
    ],
  }
}

/** Crea borrador del mes siguiente con el mismo personal (celdas vacías). */
export function createNextMonthDraft(doc: ScheduleDoc): ScheduleDoc {
  const month = doc.month === 12 ? 1 : doc.month + 1
  const year = doc.month === 12 ? doc.year + 1 : doc.year
  const staff = doc.staff.map((s, i) => ({
    ...s,
    id: uid(s.fun === 'MED' || s.fun.startsWith('M') ? 'med' : 'enf'),
    order: i + 1,
    horasMedicas: 0,
    horasViolenciaDomestica: 0,
    horasLactancia: 0,
    horasExtras: 0,
  }))
  return {
    ...doc,
    id: uid('sch'),
    month,
    year,
    staff,
    cells: {},
    status: 'BORRADOR',
    version: 1,
    signatures: [],
    notes: '',
    contingencyPlan: '',
    contingencyStaff: [],
    llamado: false,
    vacacionesFlag: false,
    updatedAt: new Date().toISOString(),
    audit: [
      {
        id: uid('aud'),
        at: new Date().toISOString(),
        userName: 'Usuario',
        action: 'crear_mes_siguiente',
        detail: `Desde ${doc.month}/${doc.year} → ${month}/${year}`,
      },
    ],
  }
}

/**
 * Copia el patrón de turnos de una persona hacia otra,
 * solo en celdas vacías del destino.
 */
export function copyCellsBetweenStaff(
  doc: ScheduleDoc,
  fromId: string,
  toId: string,
): ScheduleDoc {
  if (fromId === toId) return doc
  const days = daysInMonth(doc.year, doc.month)
  const cells = { ...doc.cells }
  let painted = 0
  for (let d = 1; d <= days; d++) {
    const src = cells[`${fromId}:${d}`]
    if (!src) continue
    const destKey = `${toId}:${d}`
    if (cells[destKey]) continue
    cells[destKey] = src
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
        action: 'copiar_turnos_persona',
        detail: `from=${fromId} to=${toId} celdas=${painted}`,
      },
    ],
  }
}

/** Ordena personal A–Z por nombre (mantiene FUN como secundario). */
export function sortStaffByName(doc: ScheduleDoc): ScheduleDoc {
  const staff = [...doc.staff]
    .sort((a, b) => {
      const an = a.name.trim().toLowerCase()
      const bn = b.name.trim().toLowerCase()
      if (!an && bn) return 1
      if (an && !bn) return -1
      return an.localeCompare(bn, 'es') || a.fun.localeCompare(b.fun)
    })
    .map((s, i) => ({ ...s, order: i + 1 }))
  return {
    ...doc,
    staff,
    version: doc.version + 1,
    updatedAt: new Date().toISOString(),
    audit: [
      ...doc.audit,
      {
        id: uid('aud'),
        at: new Date().toISOString(),
        userName: 'Usuario',
        action: 'ordenar_personal',
        detail: 'A-Z por nombre',
      },
    ],
  }
}

/**
 * Agrega nombres pegados (uno por línea) como filas nuevas.
 * Líneas vacías se ignoran; no duplica nombres exactos ya existentes.
 */
export function addStaffFromNameList(
  doc: ScheduleDoc,
  text: string,
): ScheduleDoc {
  const existing = new Set(
    doc.staff.map((s) => s.name.trim().toLowerCase()).filter(Boolean),
  )
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return doc

  const isEnf = doc.serviceType === 'enfermeria'
  const extras: StaffMember[] = []
  for (const name of lines) {
    const key = name.toLowerCase()
    if (existing.has(key)) continue
    existing.add(key)
    extras.push({
      id: uid(isEnf ? 'enf' : 'med'),
      name,
      fun: isEnf ? 'ENF' : 'MED',
      role: isEnf ? 'Enfermera/o' : 'Médico',
      relacionLaboral: 'LOSEP',
      codigoPersonal: isEnf ? 'D1' : 'CE',
      order: doc.staff.length + extras.length + 1,
      section: isEnf
        ? 'Enfermeras/os y Auxiliar de Enfermería'
        : 'Personal médico',
      serviceUnit: doc.unitName,
      active: true,
    })
  }
  if (extras.length === 0) return doc
  return {
    ...doc,
    staff: [...doc.staff, ...extras].map((s, i) => ({ ...s, order: i + 1 })),
    version: doc.version + 1,
    updatedAt: new Date().toISOString(),
    audit: [
      ...doc.audit,
      {
        id: uid('aud'),
        at: new Date().toISOString(),
        userName: 'Usuario',
        action: 'pegar_nombres',
        detail: `${extras.length} nombres agregados`,
      },
    ],
  }
}

/**
 * Rellena celdas vacías de cada persona con su código habitual
 * (si la clave existe en la plantilla).
 */
export function applyHabitualCodesToEmpty(doc: ScheduleDoc): ScheduleDoc {
  const days = daysInMonth(doc.year, doc.month)
  const cells = { ...doc.cells }
  let painted = 0
  for (const s of doc.staff) {
    if (!s.name.trim()) continue
    const code = (s.codigoPersonal || '').trim().toUpperCase()
    if (!code || !shiftMeta(doc.serviceType, code)) continue
    for (let d = 1; d <= days; d++) {
      const key = `${s.id}:${d}`
      if (cells[key]) continue
      cells[key] = code
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
        action: 'codigo_habitual',
        detail: `${painted} celdas con código habitual`,
      },
    ],
  }
}

export type EmptyStaffReport = {
  staffId: string
  name: string
  fun: string
  emptyDays: number
  filledDays: number
  totalDays: number
}

/** Personal con celdas vacías (días sin clave). */
export function emptyCellsReport(doc: ScheduleDoc): EmptyStaffReport[] {
  const days = daysInMonth(doc.year, doc.month)
  const out: EmptyStaffReport[] = []
  for (const s of [...doc.staff].sort((a, b) => a.order - b.order)) {
    if (!s.name.trim()) continue
    let empty = 0
    let filled = 0
    for (let d = 1; d <= days; d++) {
      if (doc.cells[`${s.id}:${d}`]) filled += 1
      else empty += 1
    }
    if (empty === 0) continue
    out.push({
      staffId: s.id,
      name: s.name,
      fun: s.fun,
      emptyDays: empty,
      filledDays: filled,
      totalDays: days,
    })
  }
  return out.sort((a, b) => b.emptyDays - a.emptyDays)
}

/** Intercambia dos claves en todo el horario (p. ej. D1 ↔ N1). */
export function swapCodesInSchedule(
  doc: ScheduleDoc,
  codeA: string,
  codeB: string,
): ScheduleDoc {
  if (!codeA || !codeB || codeA === codeB) return doc
  const cells = { ...doc.cells }
  let swapped = 0
  for (const [k, v] of Object.entries(cells)) {
    if (v === codeA) {
      cells[k] = codeB
      swapped += 1
    } else if (v === codeB) {
      cells[k] = codeA
      swapped += 1
    }
  }
  if (swapped === 0) return doc
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
        action: 'intercambiar_claves',
        detail: `${codeA} ↔ ${codeB} (${swapped})`,
      },
    ],
  }
}
