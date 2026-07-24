import type { ServiceType, StaffMember } from '../types'
import { uid } from '../types'

const STAFF_KEY = 'hgp-staff-library-v1'

export type StaffLibrary = Record<string, StaffMember[]>

function libraryKey(serviceType: ServiceType, unitName: string): string {
  return `${serviceType}::${unitName}`
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
) {
  const all = readAll()
  all[libraryKey(serviceType, unitName)] = staff.map((s, i) => ({
    ...s,
    serviceUnit: unitName,
    order: i + 1,
    active: s.active !== false,
  }))
  writeAll(all)
}

export function upsertStaff(
  serviceType: ServiceType,
  unitName: string,
  member: StaffMember,
): StaffMember[] {
  const list = listStaff(serviceType, unitName)
  const idx = list.findIndex((s) => s.id === member.id)
  if (idx >= 0) list[idx] = { ...member, serviceUnit: unitName }
  else list.push({ ...member, serviceUnit: unitName, order: list.length + 1 })
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
      .map((s) => ({ ...s, serviceUnit: to })),
  ]
  all[toKey] = merged.map((s, i) => ({
    ...s,
    serviceUnit: to,
    order: i + 1,
  }))
  delete all[fromKey]
  writeAll(all)
}
