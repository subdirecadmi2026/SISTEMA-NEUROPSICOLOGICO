import type { ScheduleDoc, SavedIndexItem } from '../types'

export type { SavedIndexItem }

const STORAGE_KEY = 'hgp-horarios-v1'

function migrate(doc: ScheduleDoc): ScheduleDoc {
  return {
    ...doc,
    status: doc.status ?? 'BORRADOR',
    version: doc.version ?? 1,
    signatures: doc.signatures ?? [],
    electronicSigns: doc.electronicSigns ?? [],
    audit: doc.audit ?? [],
    reviewComments: doc.reviewComments ?? [],
    coverageRule: doc.coverageRule ?? {
      minStaffPerDay: 2,
      minHoursPerDay: 16,
    },
  }
}

function readAll(): Record<string, ScheduleDoc> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, ScheduleDoc>
    const out: Record<string, ScheduleDoc> = {}
    for (const [k, v] of Object.entries(parsed)) out[k] = migrate(v)
    return out
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
      status: d.status,
      hasOpenCorrections: (d.reviewComments ?? []).some((c) => !c.resolved),
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function saveSchedule(doc: ScheduleDoc): ScheduleDoc {
  const next = migrate({ ...doc, updatedAt: new Date().toISOString() })
  const all = readAll()
  all[next.id] = next
  writeAll(all)
  return next
}

export function loadSchedule(id: string): ScheduleDoc | null {
  const doc = readAll()[id]
  return doc ? migrate(doc) : null
}

export function deleteSchedule(id: string) {
  const all = readAll()
  delete all[id]
  writeAll(all)
}

export function findScheduleByPeriod(
  serviceType: ScheduleDoc['serviceType'],
  unitName: string,
  year: number,
  month: number,
): ScheduleDoc | null {
  const found = Object.values(readAll()).find(
    (d) =>
      d.serviceType === serviceType &&
      d.unitName === unitName &&
      d.year === year &&
      d.month === month,
  )
  return found ? migrate(found) : null
}
