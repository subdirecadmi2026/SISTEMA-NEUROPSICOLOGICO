import type { ServiceType, StaffMember } from '../types'
import { uid } from '../types'
import { listSavedSchedules, loadSchedule } from './storage'

const STAFF_KEY = 'hgp-staff-library-v1'

export type StaffLibrary = Record<string, StaffMember[]>

/** Entrada plana para sync Supabase. */
export type StaffLibraryEntry = StaffMember & {
  serviceType: ServiceType
  unitName: string
  updatedAt: string
}

function libraryKey(serviceType: ServiceType, unitName: string): string {
  return `${serviceType}::${unitName}`
}

function nowIso() {
  return new Date().toISOString()
}

function stampMember(s: StaffMember): StaffMember {
  return {
    ...s,
    updatedAt: nowIso(),
  }
}

function readAll(): StaffLibrary {
  try {
    const raw = localStorage.getItem(STAFF_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as StaffLibrary
  } catch {
    return {}
  }
}

function writeAll(all: StaffLibrary) {
  localStorage.setItem(STAFF_KEY, JSON.stringify(all))
}

/** Dispara sync remoto sin bloquear la UI (evita ciclo de imports). */
function queueRemotePush() {
  void import('./remoteCatalog')
    .then((m) => m.pushAllStaffLibraryRemote(flattenStaffLibrary()))
    .catch(() => {
      /* local sigue operativo */
    })
}

export function listStaff(
  serviceType: ServiceType,
  unitName: string,
): StaffMember[] {
  const all = readAll()
  return [...(all[libraryKey(serviceType, unitName)] ?? [])].sort(
    (a, b) => a.order - b.order,
  )
}

export function saveStaffList(
  serviceType: ServiceType,
  unitName: string,
  staff: StaffMember[],
  opts?: { syncRemote?: boolean },
) {
  const all = readAll()
  all[libraryKey(serviceType, unitName)] = staff.map((s, i) =>
    stampMember({
      ...s,
      serviceUnit: unitName,
      order: i + 1,
      active: s.active !== false,
    }),
  )
  writeAll(all)
  if (opts?.syncRemote !== false) queueRemotePush()
}

export function upsertStaff(
  serviceType: ServiceType,
  unitName: string,
  member: StaffMember,
): StaffMember[] {
  const list = listStaff(serviceType, unitName)
  const idx = list.findIndex((s) => s.id === member.id)
  if (idx >= 0) list[idx] = stampMember({ ...member, serviceUnit: unitName })
  else
    list.push(
      stampMember({
        ...member,
        serviceUnit: unitName,
        order: list.length + 1,
      }),
    )
  saveStaffList(serviceType, unitName, list)
  return listStaff(serviceType, unitName)
}

export function removeStaffFromLibrary(
  serviceType: ServiceType,
  unitName: string,
  id: string,
): StaffMember[] {
  const list = listStaff(serviceType, unitName).filter((s) => s.id !== id)
  saveStaffList(serviceType, unitName, list)
  return list
}

export function createEmptyStaff(
  serviceType: ServiceType,
  unitName: string,
): StaffMember {
  const isEnf = serviceType === 'enfermeria'
  return {
    id: uid(isEnf ? 'enf' : 'med'),
    name: '',
    fun: isEnf ? 'ENF' : 'MED',
    role: isEnf ? 'Enfermera' : 'Médico tratante',
    relacionLaboral: 'LOSEP',
    codigoPersonal: isEnf ? 'D1' : 'CE',
    section: isEnf
      ? 'Enfermeras/os y Auxiliar de Enfermería'
      : 'Médicos tratantes',
    serviceUnit: unitName,
    active: true,
    order: 1,
    horasMedicas: 0,
    horasViolenciaDomestica: 0,
    horasLactancia: 0,
    horasExtras: 0,
    observaciones: '',
    updatedAt: nowIso(),
  }
}

/** Fusiona personal de biblioteca en un horario (reemplaza staff, conserva celdas de IDs coincidentes). */
export function mergeStaffIntoScheduleStaff(
  current: StaffMember[],
  library: StaffMember[],
): StaffMember[] {
  const byId = new Map(current.map((s) => [s.id, s]))
  return library
    .filter((s) => s.active !== false)
    .map((s, i) => {
      const prev = byId.get(s.id)
      return {
        ...s,
        order: i + 1,
        horasMedicas: prev?.horasMedicas ?? s.horasMedicas ?? 0,
        horasViolenciaDomestica:
          prev?.horasViolenciaDomestica ?? s.horasViolenciaDomestica ?? 0,
        horasLactancia: prev?.horasLactancia ?? s.horasLactancia ?? 0,
        horasExtras: prev?.horasExtras ?? s.horasExtras ?? 0,
        observaciones: prev?.observaciones ?? s.observaciones ?? '',
      }
    })
}

export function cloneStaffForSchedule(staff: StaffMember[]): StaffMember[] {
  return staff
    .filter((s) => s.active !== false)
    .map((s, i) => ({
      ...s,
      order: i + 1,
      horasMedicas: s.horasMedicas ?? 0,
      horasViolenciaDomestica: s.horasViolenciaDomestica ?? 0,
      horasLactancia: s.horasLactancia ?? 0,
      horasExtras: s.horasExtras ?? 0,
    }))
}

/**
 * Guarda/actualiza en biblioteca los médicos del horario (por nombre).
 * Conserva IDs de biblioteca cuando el nombre coincide.
 */
export function syncScheduleStaffToLibrary(
  serviceType: ServiceType,
  unitName: string,
  scheduleStaff: StaffMember[],
): number {
  const named = scheduleStaff.filter((s) => s.name.trim())
  if (named.length === 0) return 0
  const existing = listStaff(serviceType, unitName)
  const byName = new Map(
    existing.map((s) => [s.name.trim().toLowerCase(), s] as const),
  )
  const next: StaffMember[] = []
  const seen = new Set<string>()
  for (const s of named) {
    const key = s.name.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const prev = byName.get(key)
    next.push({
      ...s,
      id: prev?.id ?? s.id,
      serviceUnit: unitName,
      active: true,
      fun: serviceType === 'medico' ? 'MED' : s.fun,
      updatedAt: nowIso(),
    })
    byName.delete(key)
  }
  // Conserva otros de biblioteca no presentes en el horario
  for (const s of byName.values()) next.push(s)
  saveStaffList(serviceType, unitName, next)
  return named.length
}

export function listStaffLibraryBuckets(): Array<{
  serviceType: ServiceType
  unitName: string
  count: number
}> {
  const all = readAll()
  return Object.entries(all)
    .map(([key, staff]) => {
      const [serviceType, ...rest] = key.split('::')
      return {
        serviceType: serviceType as ServiceType,
        unitName: rest.join('::'),
        count: staff.filter((s) => s.active !== false).length,
      }
    })
    .filter((b) => b.unitName)
    .sort((a, b) =>
      `${a.serviceType}${a.unitName}`.localeCompare(
        `${b.serviceType}${b.unitName}`,
        'es',
      ),
    )
}

export function clearStaffLibraryBucket(
  serviceType: ServiceType,
  unitName: string,
) {
  const all = readAll()
  delete all[libraryKey(serviceType, unitName)]
  writeAll(all)
  queueRemotePush()
}

/** Mueve el personal de biblioteca al renombrar una especialidad. */
export function renameStaffLibraryUnit(
  serviceType: ServiceType,
  from: string,
  to: string,
) {
  const fromKey = libraryKey(serviceType, from)
  const toKey = libraryKey(serviceType, to)
  if (fromKey === toKey) return
  const all = readAll()
  const fromList = all[fromKey]
  if (!fromList?.length) return
  const existing = all[toKey] ?? []
  const byName = new Set(existing.map((s) => s.name.trim().toLowerCase()))
  const merged = [
    ...existing,
    ...fromList
      .filter((s) => !byName.has(s.name.trim().toLowerCase()))
      .map((s) => ({ ...s, serviceUnit: to, updatedAt: nowIso() })),
  ]
  all[toKey] = merged.map((s, i) => ({
    ...s,
    serviceUnit: to,
    order: i + 1,
  }))
  delete all[fromKey]
  writeAll(all)
  queueRemotePush()
}

export function flattenStaffLibrary(): StaffLibraryEntry[] {
  const all = readAll()
  const out: StaffLibraryEntry[] = []
  for (const [key, staff] of Object.entries(all)) {
    const [serviceType, ...rest] = key.split('::')
    const unitName = rest.join('::')
    if (!unitName) continue
    for (const s of staff) {
      if (!s.name?.trim()) continue
      out.push({
        ...s,
        serviceType: serviceType as ServiceType,
        unitName,
        updatedAt: s.updatedAt || nowIso(),
      })
    }
  }
  return out
}

export function replaceAllStaffLibrary(
  entries: StaffLibraryEntry[],
  opts?: { syncRemote?: boolean },
) {
  const next: StaffLibrary = {}
  for (const e of entries) {
    if (!e.name?.trim() || !e.unitName?.trim()) continue
    const key = libraryKey(e.serviceType, e.unitName)
    const list = next[key] ?? []
    const { serviceType: _st, unitName: _un, ...member } = e
    list.push({
      ...member,
      serviceUnit: e.unitName,
      updatedAt: e.updatedAt || nowIso(),
    })
    next[key] = list
  }
  for (const key of Object.keys(next)) {
    next[key] = next[key]
      .sort((a, b) => a.order - b.order)
      .map((s, i) => ({ ...s, order: i + 1 }))
  }
  writeAll(next)
  if (opts?.syncRemote) queueRemotePush()
}

export function mergeStaffLibraryEntries(
  local: StaffLibraryEntry[],
  remote: StaffLibraryEntry[],
): StaffLibraryEntry[] {
  const map = new Map<string, StaffLibraryEntry>()
  for (const e of local) map.set(e.id, e)
  for (const e of remote) {
    const prev = map.get(e.id)
    if (!prev) {
      map.set(e.id, e)
      continue
    }
    const prevAt = prev.updatedAt || ''
    const nextAt = e.updatedAt || ''
    map.set(e.id, nextAt >= prevAt ? e : prev)
  }
  return [...map.values()]
}

/** Personal con nombre tomado de horarios locales (fallback picker). */
export function staffFromLocalSchedules(
  serviceType: ServiceType,
  unitName: string,
): StaffMember[] {
  try {
    const map = new Map<string, StaffMember>()
    for (const item of listSavedSchedules()) {
      if (item.serviceType !== serviceType) continue
      if (item.unitName !== unitName) continue
      const doc = loadSchedule(item.id)
      if (!doc) continue
      for (const s of doc.staff) {
        if (!s.name.trim()) continue
        if (!map.has(s.id)) map.set(s.id, { ...s, serviceUnit: unitName })
      }
    }
    return [...map.values()]
  } catch {
    return []
  }
}
