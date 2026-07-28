import type { ScheduleDoc } from '../types'
import { plannedHours, coverageByDay } from './calendar'
import { listSavedSchedules, loadSchedule } from './storage'
import { isRemoteEnabled, listRemoteSchedules, fetchRemoteSchedule } from './api'

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

export type MonthCompareRow = {
  name: string
  fun: string
  hoursNow: number
  hoursPrev: number
  delta: number
  status: 'nuevo' | 'igual' | 'sube' | 'baja' | 'ausente'
}

export type MonthCompareResult = {
  prevLabel: string
  rows: MonthCompareRow[]
  lowDaysNow: number
  lowDaysPrev: number
  totalHoursNow: number
  totalHoursPrev: number
}

/** Compara horas del mes actual vs mes anterior guardado (mismo servicio). */
export async function compareWithPreviousMonth(
  doc: ScheduleDoc,
): Promise<MonthCompareResult | null> {
  const prev = await findPreviousSchedule(doc)
  if (!prev) return null

  const prevMonth = doc.month === 1 ? 12 : doc.month - 1
  const prevYear = doc.month === 1 ? doc.year - 1 : doc.year

  const nowStaff = doc.staff.filter((s) => s.name.trim())
  const prevByKey = new Map(
    prev.staff
      .filter((s) => s.name.trim())
      .map((s) => [`${s.fun}|${s.name}`.toLowerCase(), s]),
  )
  const seen = new Set<string>()
  const rows: MonthCompareRow[] = []

  for (const s of nowStaff) {
    const key = `${s.fun}|${s.name}`.toLowerCase()
    seen.add(key)
    const hoursNow = plannedHours(doc, s.id)
    const prevStaff = prevByKey.get(key)
    const hoursPrev = prevStaff ? plannedHours(prev, prevStaff.id) : 0
    const delta = hoursNow - hoursPrev
    rows.push({
      name: s.name,
      fun: s.fun,
      hoursNow,
      hoursPrev,
      delta,
      status: !prevStaff
        ? 'nuevo'
        : delta === 0
          ? 'igual'
          : delta > 0
            ? 'sube'
            : 'baja',
    })
  }

  for (const [key, s] of prevByKey) {
    if (seen.has(key)) continue
    const hoursPrev = plannedHours(prev, s.id)
    rows.push({
      name: s.name,
      fun: s.fun,
      hoursNow: 0,
      hoursPrev,
      delta: -hoursPrev,
      status: 'ausente',
    })
  }

  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.name.localeCompare(b.name, 'es'))

  const lowDaysNow = coverageByDay(doc).filter(
    (c) => c.count < doc.coverageRule.minStaffPerDay,
  ).length
  const lowDaysPrev = coverageByDay(prev).filter(
    (c) => c.count < prev.coverageRule.minStaffPerDay,
  ).length

  return {
    prevLabel: `${prevMonth}/${prevYear}`,
    rows,
    lowDaysNow,
    lowDaysPrev,
    totalHoursNow: rows.reduce((a, r) => a + r.hoursNow, 0),
    totalHoursPrev: rows.reduce((a, r) => a + r.hoursPrev, 0),
  }
}
