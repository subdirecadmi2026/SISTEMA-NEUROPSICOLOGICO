const STORAGE_KEY = 'hgp-horarios-v1'

import type { ScheduleDoc } from '../types'

export type SavedIndexItem = {
  id: string
  label: string
  serviceType: ScheduleDoc['serviceType']
  unitName: string
  month: number
  year: number
  updatedAt: string
}

function readAll(): Record<string, ScheduleDoc> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, ScheduleDoc>
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, ScheduleDoc>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function listSavedSchedules(): SavedIndexItem[] {
  const all = readAll()
  return Object.values(all)
    .map((d) => ({
      id: d.id,
      label: `${d.serviceType === 'enfermeria' ? 'Enf' : 'Med'} · ${d.unitName} · ${d.month}/${d.year}`,
      serviceType: d.serviceType,
      unitName: d.unitName,
      month: d.month,
      year: d.year,
      updatedAt: d.updatedAt,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function saveSchedule(doc: ScheduleDoc): ScheduleDoc {
  const next = { ...doc, updatedAt: new Date().toISOString() }
  const all = readAll()
  all[next.id] = next
  writeAll(all)
  return next
}

export function loadSchedule(id: string): ScheduleDoc | null {
  return readAll()[id] ?? null
}

export function deleteSchedule(id: string) {
  const all = readAll()
  delete all[id]
  writeAll(all)
}
