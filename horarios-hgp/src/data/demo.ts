import type { ScheduleDoc, StaffMember } from '../types'

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export function demoNursingStaff(): StaffMember[] {
  const rows: Array<[string, string, string, string, string, string]> = [
    ['Lic. María Guatatuca', 'ENF', 'Enfermera', 'LOSEP', 'D1', 'Enfermeras/os y Auxiliar de Enfermería'],
    ['Lic. Ana Chimbo', 'ENF', 'Enfermera', 'LOSEP', 'D1', 'Enfermeras/os y Auxiliar de Enfermería'],
    ['Lic. Rosa Tanguila', 'ENF', 'Enfermera', 'LOSEP', 'N1', 'Enfermeras/os y Auxiliar de Enfermería'],
    ['Lic. Julio Andi', 'ENF', 'Enfermero', 'LOSEP', 'A2', 'Enfermeras/os y Auxiliar de Enfermería'],
    ['Lic. Patricia Yumbo', 'ENF', 'Enfermera', 'Código de Trabajo', 'D1', 'Enfermeras/os y Auxiliar de Enfermería'],
    ['Int. Carla Shiguango', 'INT', 'Interna de enfermería', 'Internado', 'M', 'Internos de Enfermería'],
    ['Int. Diego Grefa', 'INT', 'Interno de enfermería', 'Internado', 'T', 'Internos de Enfermería'],
    ['Int. Elena Vargas', 'INT', 'Interna de enfermería', 'Internado', 'M', 'Internos de Enfermería'],
    ['Aux. Pedro Shiguango', 'AUX', 'Auxiliar de enfermería', 'Código de Trabajo', 'M', 'Auxiliar de Enfermería'],
    ['Aux. Carmen Grefa', 'AUX', 'Auxiliar de enfermería', 'Código de Trabajo', 'T', 'Auxiliar de Enfermería'],
    ['Aux. Luis Cerda', 'AUX', 'Auxiliar de enfermería', 'Código de Trabajo', 'MN', 'Auxiliar de Enfermería'],
  ]
  return rows.map(([name, fun, role, relacionLaboral, codigoPersonal, section], i) => ({
    id: uid('enf'),
    name,
    fun,
    role,
    relacionLaboral,
    codigoPersonal,
    section,
    order: i + 1,
    horasMedicas: 0,
    horasViolenciaDomestica: 0,
    horasLactancia: fun === 'ENF' && i === 1 ? 2 : 0,
    horasExtras: 0,
    observaciones: '',
  }))
}

export function demoMedicalStaff(): StaffMember[] {
  const rows: Array<[string, string, string, string, string]> = [
    ['Dr. Carlos Vargas', 'MED', 'Médico tratante', 'LOSEP', 'PT1'],
    ['Dra. Elena Ruiz', 'MED', 'Médica tratante', 'LOSEP', 'CE'],
    ['Dr. Luis Paredes', 'MED', 'Médico residente', 'Código de Trabajo', 'PT2'],
    ['Dra. Sofía Mera', 'MED', 'Médica tratante', 'LOSEP', 'CE'],
    ['Dr. Andrés López', 'MED', 'Médico residente', 'Código de Trabajo', 'X'],
    ['Dra. Gabriela Cerda', 'MED', 'Especialista', 'LOSEP', 'H'],
  ]
  return rows.map(([name, fun, role, relacionLaboral, codigoPersonal], i) => ({
    id: uid('med'),
    name,
    fun,
    role,
    relacionLaboral,
    codigoPersonal,
    section: 'Personal médico',
    order: i + 1,
    horasMedicas: 0,
    horasViolenciaDomestica: 0,
    horasLactancia: 0,
    horasExtras: 0,
    observaciones: '',
  }))
}

export function seedDemoCells(
  staff: StaffMember[],
  year: number,
  month: number,
  patternByFun: Record<string, string[]>,
  fallback: string[],
): Record<string, string> {
  const days = new Date(year, month, 0).getDate()
  const cells: Record<string, string> = {}
  staff.forEach((s, si) => {
    const pattern = patternByFun[s.fun] ?? fallback
    for (let d = 1; d <= days; d++) {
      const code = pattern[(si + d - 1) % pattern.length]
      if (code) cells[`${s.id}:${d}`] = code
    }
  })
  return cells
}

export function createBlankSchedule(
  serviceType: ScheduleDoc['serviceType'],
  year: number,
  month: number,
): ScheduleDoc {
  const staff =
    serviceType === 'enfermeria' ? demoNursingStaff() : demoMedicalStaff()

  const cells =
    serviceType === 'enfermeria'
      ? seedDemoCells(
          staff,
          year,
          month,
          {
            ENF: ['D1', 'D1', 'N1', 'N1', 'L', 'L', 'D1', 'N1'],
            INT: ['M', 'M', 'T', 'T', 'L', 'L', 'M', 'T'],
            AUX: ['M', 'T', 'MN', 'L', 'M', 'T', 'L', 'MN'],
          },
          ['D1', 'N1', 'L'],
        )
      : seedDemoCells(
          staff,
          year,
          month,
          {
            MED: ['CE', 'CE', 'H', 'PT1', 'L', 'CE', 'PT2', 'L'],
          },
          ['CE', 'H', 'L'],
        )

  const base = {
    id: uid('sch'),
    hospital: 'Hospital General Puyo',
    provincial: 'Dirección Provincial de Salud de Pastaza',
    serviceType,
    month,
    year,
    staff,
    cells,
    contingencyStaff: [
      {
        id: uid('cont'),
        name: '',
        coverage: '',
        phone: '',
      },
    ],
    llamado: false,
    vacacionesFlag: false,
    updatedAt: new Date().toISOString(),
  }

  if (serviceType === 'enfermeria') {
    return {
      ...base,
      department: 'Gestión de Cuidados de Enfermería',
      unitName: 'Centro Obstétrico',
      jefeServicio: 'Lic. Ana Parra',
      notes: '',
      contingencyPlan: '',
      elaboradoPor: 'Lic. Ana Parra — Líder del servicio',
      revisadoPor: 'Lic. Irma Naveda — Gestión de Enfermería',
      aprobadoPor: 'Mgs. Alex Naranjo — Dirección Asistencial',
      talentoHumano: 'Ing. Elizabeth Yánez — Talento Humano',
    }
  }

  return {
    ...base,
    department: 'Unidad de Administración de Talento Humano',
    unitName: 'Medicina interna',
    jefeServicio: '',
    notes:
      'Todas las actividades extras deben anotarse y enviarse mensualmente. Registrar interconsultas en la matriz.',
    contingencyPlan:
      'Todo permiso o vacaciones del personal médico debe incluir plan de contingencia de cobertura.',
    elaboradoPor: 'Líder del servicio',
    revisadoPor: 'Dr. Santiago Pacheco — Dirección Asistencial',
    aprobadoPor: 'Mgs. Alex Naranjo — Subdirección Médica',
    talentoHumano: 'Ing. Lourdes Yánez — Talento Humano',
  }
}
