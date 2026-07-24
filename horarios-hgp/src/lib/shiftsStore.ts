import type { ServiceType, ShiftCode } from '../types'
import { SHIFTS_ENFERMERIA, SHIFTS_MEDICO } from '../data/templates'

const SHIFTS_KEY = 'hgp-shifts-v1'

type ShiftsBlob = {
  enfermeria: ShiftCode[]
  medico: ShiftCode[]
}

function defaults(): ShiftsBlob {
  return {
    enfermeria: SHIFTS_ENFERMERIA.map((s) => ({ ...s })),
    medico: SHIFTS_MEDICO.map((s) => ({ ...s })),
  }
}

function readBlob(): ShiftsBlob {
  try {
    if (typeof localStorage === 'undefined') return defaults()
    const raw = localStorage.getItem(SHIFTS_KEY)
    if (!raw) return defaults()
    const parsed = JSON.parse(raw) as Partial<ShiftsBlob>
    return {
      enfermeria:
        Array.isArray(parsed.enfermeria) && parsed.enfermeria.length
          ? parsed.enfermeria
          : defaults().enfermeria,
      medico:
        Array.isArray(parsed.medico) && parsed.medico.length
          ? parsed.medico
          : defaults().medico,
    }
  } catch {
    return defaults()
  }
}

function writeBlob(blob: ShiftsBlob) {
  localStorage.setItem(SHIFTS_KEY, JSON.stringify(blob))
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

/** Lista de claves (turnos) del servicio — incluye personalizadas. */
export function shiftsFor(service: ServiceType): ShiftCode[] {
  return readBlob()[service].map((s) => ({ ...s }))
}

export function shiftMeta(
  service: ServiceType,
  code: string,
): ShiftCode | undefined {
  const needle = normalizeCode(code)
  return shiftsFor(service).find((s) => s.code.toUpperCase() === needle)
}

export function hoursForCode(service: ServiceType, code: string): number {
  return shiftMeta(service, code)?.hours ?? 0
}

export function upsertShift(
  service: ServiceType,
  shift: ShiftCode,
  /** Si se renombra el código, código anterior. */
  previousCode?: string,
): ShiftCode[] {
  const code = normalizeCode(shift.code)
  if (!code) throw new Error('Indique el código de la clave')
  if (!shift.label.trim()) throw new Error('Indique la descripción de la clave')
  if (!Number.isFinite(shift.hours) || shift.hours < 0) {
    throw new Error('Las horas deben ser un número válido')
  }

  const blob = readBlob()
  const list = [...blob[service]]
  const prev = previousCode ? normalizeCode(previousCode) : code
  const idx = list.findIndex((s) => s.code.toUpperCase() === prev)

  const next: ShiftCode = {
    code,
    label: shift.label.trim(),
    hours: Number(shift.hours),
    timeRange: shift.timeRange?.trim() || undefined,
    note: shift.note?.trim() || undefined,
    color: shift.color?.trim() || '#e8eef5',
    text: shift.text?.trim() || '#1c3a5c',
    group: shift.group || 'turno',
  }

  const clash = list.findIndex(
    (s, i) =>
      i !== idx && s.code.toUpperCase() === code,
  )
  if (clash >= 0) throw new Error(`Ya existe la clave ${code}`)

  if (idx >= 0) list[idx] = next
  else list.push(next)

  list.sort((a, b) => {
    const g = a.group.localeCompare(b.group)
    return g !== 0 ? g : a.code.localeCompare(b.code, 'es')
  })
  blob[service] = list
  writeBlob(blob)
  return shiftsFor(service)
}

export function removeShift(service: ServiceType, code: string): ShiftCode[] {
  const blob = readBlob()
  const needle = normalizeCode(code)
  const next = blob[service].filter((s) => s.code.toUpperCase() !== needle)
  if (next.length === blob[service].length) {
    throw new Error('Clave no encontrada')
  }
  if (next.length === 0) {
    throw new Error('Debe quedar al menos una clave')
  }
  blob[service] = next
  writeBlob(blob)
  return shiftsFor(service)
}

export function resetShiftsToDefaults(service?: ServiceType): void {
  if (!service) {
    writeBlob(defaults())
    return
  }
  const blob = readBlob()
  blob[service] = defaults()[service]
  writeBlob(blob)
}

export const SHIFT_GROUPS: Array<ShiftCode['group']> = [
  'turno',
  'area',
  'ausencia',
]

export const SHIFT_GROUP_LABEL: Record<ShiftCode['group'], string> = {
  turno: 'Turno',
  area: 'Área',
  ausencia: 'Ausencia',
}

export function emptyShiftDraft(
  group: ShiftCode['group'] = 'turno',
): ShiftCode {
  const hours = group === 'ausencia' ? 0 : group === 'area' ? 0 : 8
  return {
    code: '',
    label: '',
    hours,
    timeRange: '',
    note: '',
    color:
      group === 'ausencia'
        ? '#f1f3f5'
        : group === 'area'
          ? '#dde8f8'
          : '#d9ebe9',
    text: '#1c3a5c',
    group,
  }
}
