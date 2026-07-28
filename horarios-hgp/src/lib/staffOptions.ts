import type { ServiceType, ShiftCode } from '../types'
import { hoursForCode, shiftsFor } from './shiftsStore'

/** Relaciones laborales habituales en HGP. */
export const RELACIONES_LABORALES = [
  'LOSEP',
  'Código de Trabajo',
  'Contrato ocasional',
  'Convenio',
  'Internado',
  'Residente',
  'Otro',
] as const

/** Cargos / roles frecuentes del personal médico. */
export const CARGOS_MEDICO = [
  'Médico tratante',
  'Médico residente',
  'Médico rural',
  'Especialista',
  'Subespecialista',
  'Médico general',
  'Jefe de servicio',
  'Médico de planta',
] as const

/** Secciones / agrupaciones del cuadro médico. */
export const SECTIONS_MEDICO = [
  'Personal médico',
  'Médicos tratantes',
  'Médicos residentes',
  'Médicos de guardia',
  'Especialistas',
  'Consulta externa',
] as const

export const SECTIONS_ENF = [
  'Enfermeras/os y Auxiliar de Enfermería',
  'Internos de Enfermería',
  'Auxiliar de Enfermería',
] as const

/** Solo turnos productivos (no áreas ni ausencias) para clave habitual. */
export function habitualTurnoOptions(serviceType: ServiceType): ShiftCode[] {
  return shiftsFor(serviceType)
    .filter((s) => s.group === 'turno' && s.hours > 0)
    .sort((a, b) => a.hours - b.hours || a.code.localeCompare(b.code, 'es'))
}

export function formatHabitualCodeLabel(
  serviceType: ServiceType,
  code: string,
): string {
  const c = code.trim().toUpperCase()
  if (!c) return '—'
  const opt = habitualTurnoOptions(serviceType).find(
    (s) => s.code.toUpperCase() === c,
  )
  if (opt) return `${opt.code} · ${opt.hours} h · ${opt.label}`
  const h = hoursForCode(serviceType, c)
  return h > 0 ? `${c} · ${h} h` : c
}
