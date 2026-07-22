import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import type { ScheduleDoc } from '../types'
import { FERIADOS_2026, MONTHS_ES } from '../types'
import {
  countCodeForStaff,
  daysInMonth,
  plannedHours,
  plannedShifts,
  weekdayLetter,
} from './calendar'
import { SERVICE_LABEL, shiftsFor } from '../data/templates'

export function exportScheduleExcel(doc: ScheduleDoc) {
  const days = daysInMonth(doc.year, doc.month)
  const service = SERVICE_LABEL[doc.serviceType]
  const period = `${MONTHS_ES[doc.month - 1].toUpperCase()} ${doc.year}`
  const staffSorted = [...doc.staff].sort((a, b) => a.order - b.order)

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
    [`Tipo: ${service} · Período: ${period}`],
    [],
  ]

  const dayNums: (string | number)[] = [
    'N°',
    'FUN',
    'NOMBRES Y APELLIDOS',
    'RELACIÓN LABORAL',
    'CÓDIGO',
    ...Array.from({ length: days }, (_, i) => i + 1),
    'TURNOS PLANIF.',
    'HORAS PLANIF.',
    'DÍAS VACACIONES',
    'OBSERVACIONES',
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
    '',
    '',
    '',
    '',
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
    row.push(plannedShifts(doc, s.id))
    row.push(plannedHours(doc, s.id))
    row.push(countCodeForStaff(doc, s.id, 'V'))
    row.push('')
    return row
  })

  const legendTitle = [['CLAVES / DESCRIPCIÓN DE SIGLAS']]
  const legend = shiftsFor(doc.serviceType).map((s) => [
    s.code,
    `${s.label}${s.timeRange ? ` · ${s.timeRange}` : ''}${s.note ? ` (${s.note})` : ''} · ${s.hours} h`,
  ])

  const footer: (string | number)[][] = [
    [],
    ['PLAN DE CONTINGENCIA', doc.contingencyPlan],
    ['OBSERVACIONES', doc.notes],
    ['FERIADOS 2026', FERIADOS_2026.join(' | ')],
    [],
    ['ELABORADO POR', doc.elaboradoPor],
    ['REVISADO POR', doc.revisadoPor],
    ['APROBADO POR', doc.aprobadoPor],
    ['TALENTO HUMANO', doc.talentoHumano],
  ]

  const aoa: (string | number)[][] = [
    ...header,
    dayNums,
    dayLetters,
    ...body,
    [],
    ...legendTitle,
    ...legend,
    ...footer,
  ]

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = [
    { wch: 4 },
    { wch: 6 },
    { wch: 28 },
    { wch: 16 },
    { wch: 8 },
    ...Array.from({ length: days }, () => ({ wch: 4 })),
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
  ]

  // Hoja CLAVES separada (como en la plantilla médica)
  const clavesAoa: (string | number)[][] = [
    ['CLAVES — ' + service],
    ['CÓDIGO', 'DESCRIPCIÓN', 'HORARIO', 'HORAS', 'GRUPO'],
    ...shiftsFor(doc.serviceType).map((s) => [
      s.code,
      s.label,
      s.timeRange ?? '',
      s.hours,
      s.group,
    ]),
  ]
  const wsClaves = XLSX.utils.aoa_to_sheet(clavesAoa)
  wsClaves['!cols'] = [
    { wch: 8 },
    { wch: 36 },
    { wch: 16 },
    { wch: 8 },
    { wch: 10 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'HORARIO')
  XLSX.utils.book_append_sheet(wb, wsClaves, 'CLAVES')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const name = `Horario_${service}_${doc.unitName.replace(/\s+/g, '_')}_${doc.year}-${String(doc.month).padStart(2, '0')}.xlsx`
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), name)
}
