import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import type { ScheduleDoc } from '../types'
import { FERIADOS_2026, MONTHS_ES } from '../types'
import {
  countCodeForStaff,
  coverageByDay,
  daysInMonth,
  plannedHours,
  plannedShifts,
  totalPaidHours,
  weekdayLetter,
} from './calendar'
import { SERVICE_LABEL, shiftsFor } from '../data/templates'

export function exportScheduleExcel(doc: ScheduleDoc) {
  const days = daysInMonth(doc.year, doc.month)
  const service = SERVICE_LABEL[doc.serviceType]
  const period = `${MONTHS_ES[doc.month - 1].toUpperCase()} ${doc.year}`
  const staffSorted = [...doc.staff].sort((a, b) => a.order - b.order)
  const isEnf = doc.serviceType === 'enfermeria'

  const header: (string | number)[][] = [
    [doc.provincial],
    [doc.hospital],
    [doc.department],
    ['CUADRO DE TRABAJO DE PERSONAL DIRECTO O INDIRECTO'],
    [],
    [
      `SERVICIO: ${doc.unitName}`,
      `JEFE DE SERVICIO: ${doc.jefeServicio}`,
      `AÑO: ${doc.year}`,
      `MES: ${MONTHS_ES[doc.month - 1].toUpperCase()}`,
    ],
    [
      `Tipo: ${service} · Período: ${period}`,
      doc.llamado ? 'LLAMADO: SÍ' : 'LLAMADO: NO',
      doc.vacacionesFlag ? 'VACACIONES: SÍ' : 'VACACIONES: NO',
    ],
    [],
  ]

  const summaryHeaders = isEnf
    ? [
        'TURNOS PLANIF.',
        'HORAS PLANIF.',
        'DÍAS VAC.',
        'H. MÉDICAS',
        'H. VIOL. DOM.',
        'LACTANCIA',
        'H. EXTRAS',
        'TOTAL H. PAGADAS',
        'OBSERVACIONES',
      ]
    : ['HORAS', 'OBSERVACIONES']

  const dayNums: (string | number)[] = [
    'N°',
    'FUN',
    'NOMBRES Y APELLIDOS',
    'RELACIÓN LABORAL',
    'CÓDIGO',
    ...Array.from({ length: days }, (_, i) => i + 1),
    ...summaryHeaders,
  ]

  const dayLetters: (string | number)[] = [
    '',
    '',
    '',
    '',
    '',
    ...Array.from({ length: days }, (_, i) =>
      weekdayLetter(doc.year, doc.month, i + 1),
    ),
    ...summaryHeaders.map(() => ''),
  ]

  const body = staffSorted.map((s, idx) => {
    const row: (string | number)[] = [
      idx + 1,
      s.fun,
      s.name,
      s.relacionLaboral,
      s.codigoPersonal,
    ]
    for (let d = 1; d <= days; d++) {
      row.push(doc.cells[`${s.id}:${d}`] ?? '')
    }
    if (isEnf) {
      row.push(
        plannedShifts(doc, s.id),
        plannedHours(doc, s.id),
        countCodeForStaff(doc, s.id, 'V'),
        s.horasMedicas ?? 0,
        s.horasViolenciaDomestica ?? 0,
        s.horasLactancia ?? 0,
        s.horasExtras ?? 0,
        totalPaidHours(doc, s),
        s.observaciones ?? '',
      )
    } else {
      row.push(plannedHours(doc, s.id), s.observaciones ?? '')
    }
    return row
  })

  const legend = shiftsFor(doc.serviceType).map((s) => [
    s.code,
    `${s.label}${s.timeRange ? ` · ${s.timeRange}` : ''}${s.note ? ` (${s.note})` : ''} · ${s.hours} h`,
  ])

  const contRows = doc.contingencyStaff.map((c, i) => [
    i + 1,
    c.name,
    c.coverage,
    c.phone,
  ])

  const dist = coverageByDay(doc)

  const aoa: (string | number)[][] = [
    ...header,
    dayNums,
    dayLetters,
    ...body,
    [],
    ['CLAVES / DESCRIPCIÓN DE SIGLAS'],
    ...legend,
    [],
    ['PLAN DE CONTINGENCIA', doc.contingencyPlan],
    ['N°', 'NOMBRE', 'COBERTURA', 'TELÉFONO'],
    ...contRows,
    [],
    ['OBSERVACIONES', doc.notes],
    ['FERIADOS 2026', FERIADOS_2026.join(' | ')],
    [],
    ['ELABORADO POR', doc.elaboradoPor],
    ['REVISADO POR', doc.revisadoPor],
    ['APROBADO POR', doc.aprobadoPor],
    ['TALENTO HUMANO', doc.talentoHumano],
  ]

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = [
    { wch: 4 },
    { wch: 6 },
    { wch: 28 },
    { wch: 16 },
    { wch: 8 },
    ...Array.from({ length: days }, () => ({ wch: 4 })),
    ...summaryHeaders.map(() => ({ wch: 12 })),
  ]

  const wsClaves = XLSX.utils.aoa_to_sheet([
    ['CLAVES — ' + service],
    ['CÓDIGO', 'DESCRIPCIÓN', 'HORARIO', 'HORAS', 'GRUPO'],
    ...shiftsFor(doc.serviceType).map((s) => [
      s.code,
      s.label,
      s.timeRange ?? '',
      s.hours,
      s.group,
    ]),
  ])
  wsClaves['!cols'] = [
    { wch: 8 },
    { wch: 36 },
    { wch: 16 },
    { wch: 8 },
    { wch: 10 },
  ]

  const wsDist = XLSX.utils.aoa_to_sheet([
    ['DISTRIBUCIÓN DE COBERTURA — ' + period],
    ['DÍA', 'LETRA', 'PERSONAL CON TURNO', 'HORAS CUBIERTAS'],
    ...dist.map((d) => [
      d.day,
      weekdayLetter(doc.year, doc.month, d.day),
      d.count,
      d.hours,
    ]),
  ])

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'HORARIO')
  XLSX.utils.book_append_sheet(wb, wsClaves, 'CLAVES')
  XLSX.utils.book_append_sheet(wb, wsDist, 'DISTRIBUCION')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const name = `Horario_${service}_${doc.unitName.replace(/\s+/g, '_')}_${doc.year}-${String(doc.month).padStart(2, '0')}.xlsx`
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), name)
}
