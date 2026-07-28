import type { ServiceType } from '../types'
import { UNITS_ENFERMERIA, UNITS_MEDICO } from '../data/templates'
import { renameStaffLibraryUnit } from './staffLibrary'

const UNITS_KEY = 'hgp-units-v1'

type UnitsBlob = {
  enfermeria: string[]
  medico: string[]
}

function defaults(): UnitsBlob {
  return {
    enfermeria: [...UNITS_ENFERMERIA],
    medico: [...UNITS_MEDICO],
  }
}

function readBlob(): UnitsBlob {
  try {
    const raw = localStorage.getItem(UNITS_KEY)
    if (!raw) return defaults()
    const parsed = JSON.parse(raw) as Partial<UnitsBlob>
    return {
      enfermeria:
        Array.isArray(parsed.enfermeria) && parsed.enfermeria.length
          ? parsed.enfermeria
          : [...UNITS_ENFERMERIA],
      medico:
        Array.isArray(parsed.medico) && parsed.medico.length
          ? parsed.medico
          : [...UNITS_MEDICO],
    }
  } catch {
    return defaults()
  }
}

function writeBlob(blob: UnitsBlob) {
  localStorage.setItem(UNITS_KEY, JSON.stringify(blob))
  queueUnitsRemotePush()
}

function queueUnitsRemotePush() {
  if (typeof window === 'undefined') return
  void import('./remoteAppState')
    .then(({ pushUnitsRemote }) => pushUnitsRemote(readBlob()))
    .catch(() => undefined)
}

export function readUnitsBlob(): UnitsBlob {
  return readBlob()
}

export function replaceUnitsBlob(
  next: UnitsBlob,
  opts?: { syncRemote?: boolean },
) {
  localStorage.setItem(UNITS_KEY, JSON.stringify(next))
  if (opts?.syncRemote !== false) queueUnitsRemotePush()
}

export function listUnits(serviceType: ServiceType): string[] {
  return [...readBlob()[serviceType]]
}

export function listAllUnits(): UnitsBlob {
  return readBlob()
}

export function addUnit(serviceType: ServiceType, name: string): string[] {
  const n = name.trim()
  if (!n) throw new Error('Indique el nombre del servicio')
  const blob = readBlob()
  if (blob[serviceType].some((u) => u.toLowerCase() === n.toLowerCase())) {
    throw new Error('Ese servicio ya existe')
  }
  blob[serviceType] = [...blob[serviceType], n].sort((a, b) =>
    a.localeCompare(b, 'es'),
  )
  writeBlob(blob)
  return listUnits(serviceType)
}

export function renameUnit(
  serviceType: ServiceType,
  from: string,
  to: string,
): string[] {
  const next = to.trim()
  if (!next) throw new Error('Indique el nuevo nombre')
  const blob = readBlob()
  const idx = blob[serviceType].findIndex((u) => u === from)
  if (idx < 0) throw new Error('Servicio no encontrado')
  if (
    blob[serviceType].some(
      (u, i) => i !== idx && u.toLowerCase() === next.toLowerCase(),
    )
  ) {
    throw new Error('Ya existe un servicio con ese nombre')
  }
  blob[serviceType][idx] = next
  blob[serviceType] = [...blob[serviceType]].sort((a, b) =>
    a.localeCompare(b, 'es'),
  )
  writeBlob(blob)
  renameStaffLibraryUnit(serviceType, from, next)
  return listUnits(serviceType)
}

export function removeUnit(serviceType: ServiceType, name: string): string[] {
  const blob = readBlob()
  if (blob[serviceType].length <= 1) {
    throw new Error('Debe quedar al menos un servicio')
  }
  blob[serviceType] = blob[serviceType].filter((u) => u !== name)
  writeBlob(blob)
  return listUnits(serviceType)
}

export function resetUnitsToDefaults(): void {
  writeBlob(defaults())
}
