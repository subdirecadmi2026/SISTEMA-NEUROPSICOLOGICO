export type ServiceType = 'enfermeria' | 'medico'

export type UserRole =
  | 'lider_servicio'
  | 'gestion_enfermeria'
  | 'subdireccion'
  | 'direccion_asistencial'
  | 'talento_humano'
  | 'admin'

export type ScheduleStatus =
  | 'BORRADOR'
  | 'EN_REVISION'
  | 'APROBADO'
  | 'ARCHIVADO'

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
  serviceUnit?: string
  active?: boolean
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

export type ApprovalSignature = {
  role: UserRole | 'elaborado' | 'revisado' | 'aprobado' | 'talento_humano'
  name: string
  cargo: string
  at: string
  userId?: string
}

export type AuditEntry = {
  id: string
  at: string
  userId?: string
  userName: string
  action: string
  detail?: string
}

export type CoverageRule = {
  /** Mínimo de personal con turno productivo por día */
  minStaffPerDay: number
  /** Mínimo de horas cubiertas por día */
  minHoursPerDay: number
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
  status: ScheduleStatus
  version: number
  signatures: ApprovalSignature[]
  audit: AuditEntry[]
  coverageRule: CoverageRule
  updatedAt: string
  createdBy?: string
}

export type AppUser = {
  id: string
  email: string
  name: string
  role: UserRole
  serviceUnits: string[]
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

export const ROLE_LABEL: Record<UserRole, string> = {
  lider_servicio: 'Líder de servicio',
  gestion_enfermeria: 'Gestión de Enfermería',
  subdireccion: 'Subdirección Médica',
  direccion_asistencial: 'Dirección Asistencial',
  talento_humano: 'Talento Humano',
  admin: 'Administrador',
}

export const STATUS_LABEL: Record<ScheduleStatus, string> = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En revisión',
  APROBADO: 'Aprobado',
  ARCHIVADO: 'Archivado',
}

export const DEFAULT_COVERAGE: CoverageRule = {
  minStaffPerDay: 2,
  minHoursPerDay: 16,
}

export type SavedIndexItem = {
  id: string
  label: string
  serviceType: ServiceType
  unitName: string
  month: number
  year: number
  updatedAt: string
  status?: ScheduleStatus
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}
