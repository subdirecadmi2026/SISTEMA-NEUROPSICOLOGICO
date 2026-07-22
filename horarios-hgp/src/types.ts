export type ServiceType = 'enfermeria' | 'medico'

export type ShiftCode = {
  code: string
  label: string
  hours: number
  timeRange?: string
  note?: string
  color: string
  text?: string
  group: 'turno' | 'area' | 'ausencia'
}

export type StaffMember = {
  id: string
  name: string
  /** FUN: ENF, AUX, INT, MED, etc. */
  fun: string
  role: string
  /** Relación laboral: LOSEP, Código de Trabajo, etc. */
  relacionLaboral: string
  /** Código de clave habitual del personal (A2, D1, N1…) */
  codigoPersonal: string
  order: number
  section?: string
  /** Columnas extras (plantilla Enfermería HGP) */
  horasMedicas?: number
  horasViolenciaDomestica?: number
  horasLactancia?: number
  horasExtras?: number
  observaciones?: string
}

export type ScheduleCell = Record<string, string> // `${staffId}:${day}` -> code

export type ContingencyRow = {
  id: string
  name: string
  coverage: string
  phone: string
}

export type ScheduleDoc = {
  id: string
  hospital: string
  provincial: string
  serviceType: ServiceType
  department: string
  unitName: string
  jefeServicio: string
  month: number
  year: number
  staff: StaffMember[]
  cells: ScheduleCell
  notes: string
  contingencyPlan: string
  contingencyStaff: ContingencyRow[]
  llamado: boolean
  vacacionesFlag: boolean
  elaboradoPor: string
  revisadoPor: string
  aprobadoPor: string
  talentoHumano: string
  updatedAt: string
}

export const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export const WEEKDAYS_ES = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

/** Feriados nacionales Ecuador 2026 (referencia institucional). */
export const FERIADOS_2026 = [
  '01/01 Año Nuevo',
  '16–17/02 Carnaval',
  '03/04 Viernes Santo',
  '01/05 Día del Trabajo',
  '25/05 Batalla de Pichincha',
  '10/08 Primer Grito de Independencia',
  '09/10 Independencia de Guayaquil',
  '02–03/11 Difuntos',
  '25/12 Navidad',
]
