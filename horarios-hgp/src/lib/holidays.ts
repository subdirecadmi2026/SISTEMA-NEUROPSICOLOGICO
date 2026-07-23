/** Feriados nacionales de Ecuador (referencia MSP / calendario laboral). */

export type Holiday = {
  date: string // YYYY-MM-DD
  name: string
  editable?: boolean
  /** Origen: nacional (base) o creado/editado por admin. */
  source?: 'nacional' | 'custom'
}

const CUSTOM_KEY = 'hgp-feriados-custom-v1'
const SUPPRESSED_KEY = 'hgp-feriados-suppressed-v1'

function easterSunday(year: number): Date {
  // Algoritmo de Meeus/Jones/Butcher
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function iso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function readAllCustom(): Holiday[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Holiday[]
  } catch {
    return []
  }
}

function writeAllCustom(all: Holiday[]) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(all))
}

function readSuppressed(): Set<string> {
  try {
    const raw = localStorage.getItem(SUPPRESSED_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function writeSuppressed(ids: Set<string>) {
  localStorage.setItem(SUPPRESSED_KEY, JSON.stringify([...ids]))
}

/** Feriados fijos + móviles (Carnaval, Viernes Santo) para un año. */
export function ecuadorHolidays(year: number): Holiday[] {
  const easter = easterSunday(year)
  const carnivalMon = addDays(easter, -48)
  const carnivalTue = addDays(easter, -47)
  const goodFriday = addDays(easter, -2)

  const fixed: Array<[number, number, string]> = [
    [1, 1, 'Año Nuevo'],
    [5, 1, 'Día del Trabajo'],
    [5, 24, 'Batalla de Pichincha'],
    [8, 10, 'Primer Grito de Independencia'],
    [10, 9, 'Independencia de Guayaquil'],
    [11, 2, 'Día de los Difuntos'],
    [11, 3, 'Independencia de Cuenca'],
    [12, 25, 'Navidad'],
  ]

  const list: Holiday[] = [
    ...fixed.map(([m, d, name]) => ({
      date: `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      name,
      source: 'nacional' as const,
    })),
    { date: iso(carnivalMon), name: 'Carnaval', source: 'nacional' },
    { date: iso(carnivalTue), name: 'Carnaval', source: 'nacional' },
    { date: iso(goodFriday), name: 'Viernes Santo', source: 'nacional' },
  ]

  return list.sort((a, b) => a.date.localeCompare(b.date))
}

export function loadCustomHolidays(year: number): Holiday[] {
  return readAllCustom()
    .filter((h) => h.date.startsWith(`${year}-`))
    .map((h) => ({ ...h, editable: true, source: 'custom' as const }))
}

/** Crea o actualiza un feriado custom en esa fecha. */
export function saveCustomHoliday(holiday: Holiday) {
  const date = holiday.date.trim()
  const name = holiday.name.trim()
  if (!date || !name) throw new Error('Indique fecha y nombre del feriado')
  const all = readAllCustom().filter((h) => h.date !== date)
  all.push({ date, name, editable: true, source: 'custom' })
  writeAllCustom(all)
  // Si estaba oculto, al crearlo de nuevo lo restauramos
  const suppressed = readSuppressed()
  if (suppressed.delete(date)) writeSuppressed(suppressed)
}

/**
 * Actualiza un feriado (permite cambiar fecha y nombre).
 * `previousDate` = fecha original si se está editando.
 */
export function updateHoliday(
  previousDate: string | null,
  holiday: Holiday,
): void {
  const date = holiday.date.trim()
  const name = holiday.name.trim()
  if (!date || !name) throw new Error('Indique fecha y nombre del feriado')

  let all = readAllCustom()
  if (previousDate) {
    all = all.filter((h) => h.date !== previousDate)
    const suppressed = readSuppressed()
    // Si era nacional y cambió de fecha, ocultar la fecha original
    const wasNational = ecuadorHolidays(Number(previousDate.slice(0, 4))).some(
      (h) => h.date === previousDate,
    )
    if (wasNational && previousDate !== date) {
      suppressed.add(previousDate)
      writeSuppressed(suppressed)
    } else if (suppressed.has(previousDate) && previousDate === date) {
      suppressed.delete(previousDate)
      writeSuppressed(suppressed)
    }
  }

  // Evitar choque con otra custom distinta
  all = all.filter((h) => h.date !== date)
  all.push({ date, name, editable: true, source: 'custom' })
  writeAllCustom(all)

  const suppressed = readSuppressed()
  if (suppressed.delete(date)) writeSuppressed(suppressed)
}

/**
 * Elimina un feriado:
 * - custom → se borra del almacenamiento
 * - nacional → se marca como oculto (suppressed)
 */
export function deleteHoliday(date: string): void {
  const all = readAllCustom().filter((h) => h.date !== date)
  writeAllCustom(all)

  const year = Number(date.slice(0, 4))
  const isNational = ecuadorHolidays(year).some((h) => h.date === date)
  if (isNational) {
    const suppressed = readSuppressed()
    suppressed.add(date)
    writeSuppressed(suppressed)
  }
}

/** Alias legado. */
export function removeCustomHoliday(date: string) {
  deleteHoliday(date)
}

/** Restaura feriados nacionales ocultos y limpia custom del año (opcional). */
export function restoreNationalHolidays(year?: number) {
  if (year == null) {
    localStorage.removeItem(SUPPRESSED_KEY)
    return
  }
  const prefix = `${year}-`
  const suppressed = readSuppressed()
  for (const d of [...suppressed]) {
    if (d.startsWith(prefix)) suppressed.delete(d)
  }
  writeSuppressed(suppressed)
}

export function clearCustomHolidays(year?: number) {
  if (year == null) {
    localStorage.removeItem(CUSTOM_KEY)
    return
  }
  const prefix = `${year}-`
  writeAllCustom(readAllCustom().filter((h) => !h.date.startsWith(prefix)))
}

export function holidaysForYear(year: number): Holiday[] {
  const suppressed = readSuppressed()
  const base = ecuadorHolidays(year).filter((h) => !suppressed.has(h.date))
  const custom = loadCustomHolidays(year)
  const map = new Map<string, Holiday>()
  for (const h of base) map.set(h.date, { ...h, source: 'nacional' })
  for (const h of custom) {
    map.set(h.date, { ...h, editable: true, source: 'custom' })
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function holidayDatesInMonth(
  year: number,
  month: number,
): Set<number> {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`
  const set = new Set<number>()
  for (const h of holidaysForYear(year)) {
    if (h.date.startsWith(prefix)) {
      set.add(Number(h.date.slice(-2)))
    }
  }
  return set
}

export function formatHolidaysLabel(year: number): string {
  return holidaysForYear(year)
    .map((h) => {
      const [, m, d] = h.date.split('-')
      return `${d}/${m} ${h.name}`
    })
    .join(' · ')
}

/** Compatibilidad con UI anterior. */
export const FERIADOS_2026 = holidaysForYear(2026).map((h) => {
  const [, m, d] = h.date.split('-')
  return `${d}/${m} ${h.name}`
})
