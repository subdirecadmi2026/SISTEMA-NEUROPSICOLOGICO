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
    role: isEnf ? 'Enfermera' : 'Médico',
    relacionLaboral: 'LOSEP',
    codigoPersonal: isEnf ? 'D1' : 'CE',
    section: isEnf
      ? 'Enfermeras/os y Auxiliar de Enfermería'
      : 'Personal médico',
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
