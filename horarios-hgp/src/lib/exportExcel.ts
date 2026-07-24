import type { ScheduleDoc } from '../types'
import { MONTHS_ES } from '../types'
import {
  countCodeForStaff,
  coverageByDay,
  daysInMonth,
  plannedHours,
  plannedShifts,
  totalPaidHours,
  weekdayLetter,
} from './calendar'
import { formatHolidaysLabel } from './holidays'
import { SERVICE_LABEL, shiftsFor } from '../data/templates'

function argb(hex: string): string {
  const h = hex.replace('#', '')
  return h.length === 6 ? `FF${h.toUpperCase()}` : h.toUpperCase()
}

function thinBorder() {
  const side = {
    style: 'thin' as const,
    color: { argb: 'FF9AA8B5' },
  }
  return { top: side, left: side, bottom: side, right: side }
}

export async function exportScheduleExcel(doc: ScheduleDoc) {
  const ExcelJS = (await import('exceljs')).default
  const days = daysInMonth(doc.year, doc.month)
  const service = SERVICE_LABEL[doc.serviceType]
  const period = `${MONTHS_ES[doc.month - 1].toUpperCase()} ${doc.year}`
  const staffSorted = [...doc.staff].sort((a, b) => a.order - b.order)
  const isEnf = doc.serviceType === 'enfermeria'
  const shifts = shiftsFor(doc.serviceType)
  const shiftMap = new Map(shifts.map((s) => [s.code, s]))

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Horarios HGP'
  wb.created = new Date()

  // ——— HORARIO ———
  const ws = wb.addWorksheet('HORARIO', {
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    },
  })

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

  const colCount = 5 + days + summaryHeaders.length

  ws.mergeCells(1, 1, 1, colCount)
  ws.getCell(1, 1).value = doc.provincial
  ws.getCell(1, 1).font = { bold: true, size: 11, color: { argb: 'FF1C3A5C' } }

  ws.mergeCells(2, 1, 2, colCount)
  ws.getCell(2, 1).value = doc.hospital
  ws.getCell(2, 1).font = { bold: true, size: 14, color: { argb: 'FF1C3A5C' } }

  ws.mergeCells(3, 1, 3, colCount)
  ws.getCell(3, 1).value = doc.department
  ws.getCell(3, 1).font = { size: 11 }

  ws.mergeCells(4, 1, 4, colCount)
  ws.getCell(4, 1).value = 'CUADRO DE TRABAJO DE PERSONAL DIRECTO O INDIRECTO'
  ws.getCell(4, 1).font = { bold: true, size: 12 }
  ws.getCell(4, 1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1C3A5C' },
  }
  ws.getCell(4, 1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }

  ws.getCell(6, 1).value = `SERVICIO: ${doc.unitName}`
  ws.getCell(6, 3).value = `JEFE DE SERVICIO: ${doc.jefeServicio}`
  ws.getCell(6, 6).value = `AÑO: ${doc.year}`
  ws.getCell(6, 8).value = `MES: ${MONTHS_ES[doc.month - 1].toUpperCase()}`
  ws.getCell(7, 1).value = `Tipo: ${service} · Período: ${period}`
  ws.getCell(7, 3).value = doc.llamado ? 'BAJO LLAMADO: SÍ' : 'BAJO LLAMADO: NO'
  ws.getCell(7, 5).value = doc.vacacionesFlag ? 'VACACIONES: SÍ' : 'VACACIONES: NO'
  ws.getCell(7, 7).value = `Estado: ${doc.status}`

  const headerRow = 9
  const letterRow = 10
  const headers = [
    'N°',
    'FUN',
    'NOMBRES Y APELLIDOS',
    'RELACIÓN LABORAL',
    'CÓDIGO',
    ...Array.from({ length: days }, (_, i) => i + 1),
    ...summaryHeaders,
  ]
  headers.forEach((h, i) => {
    const cell = ws.getCell(headerRow, i + 1)
    cell.value = h
    cell.font = { bold: true, size: 8, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1C3A5C' },
    }
    cell.alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' }
    cell.border = thinBorder()
  })

  for (let d = 1; d <= days; d++) {
    const cell = ws.getCell(letterRow, 5 + d)
    cell.value = weekdayLetter(doc.year, doc.month, d)
    cell.font = { size: 8, italic: true }
    cell.alignment = { horizontal: 'center' }
    cell.border = thinBorder()
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8EEF3' },
    }
  }

  let rowIdx = 11
  staffSorted.forEach((s, idx) => {
    const row = ws.getRow(rowIdx)
    const values: (string | number)[] = [
      idx + 1,
      s.fun,
      s.name,
      s.relacionLaboral,
      s.codigoPersonal,
    ]
    for (let d = 1; d <= days; d++) {
      values.push(doc.cells[`${s.id}:${d}`] ?? '')
    }
    if (isEnf) {
      values.push(
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
      values.push(plannedHours(doc, s.id), s.observaciones ?? '')
    }
    values.forEach((v, i) => {
      const cell = row.getCell(i + 1)
      cell.value = v
      cell.border = thinBorder()
      cell.alignment = { horizontal: i >= 5 && i < 5 + days ? 'center' : 'left', vertical: 'middle' }
      cell.font = { size: 8 }
      if (i >= 5 && i < 5 + days && typeof v === 'string' && v) {
        const meta = shiftMap.get(v)
        if (meta) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: argb(meta.color) },
          }
          if (meta.text) {
            cell.font = { size: 8, bold: true, color: { argb: argb(meta.text) } }
          }
        }
      }
    })
    rowIdx += 1
  })

  rowIdx += 1
  ws.getCell(rowIdx, 1).value = 'ELABORADO POR'
  ws.getCell(rowIdx, 2).value = doc.elaboradoPor
  rowIdx += 1
  ws.getCell(rowIdx, 1).value = 'REVISADO POR'
  ws.getCell(rowIdx, 2).value = doc.revisadoPor
  rowIdx += 1
  ws.getCell(rowIdx, 1).value = 'APROBADO POR'
  ws.getCell(rowIdx, 2).value = doc.aprobadoPor
  rowIdx += 1
  ws.getCell(rowIdx, 1).value = 'TALENTO HUMANO'
  ws.getCell(rowIdx, 2).value = doc.talentoHumano
  rowIdx += 2
  ws.getCell(rowIdx, 1).value = `FERIADOS ${doc.year}`
  ws.mergeCells(rowIdx, 2, rowIdx, Math.min(colCount, 12))
  ws.getCell(rowIdx, 2).value = formatHolidaysLabel(doc.year)

  ws.getColumn(1).width = 4
  ws.getColumn(2).width = 6
  ws.getColumn(3).width = 28
  ws.getColumn(4).width = 16
  ws.getColumn(5).width = 8
  for (let d = 1; d <= days; d++) ws.getColumn(5 + d).width = 4.2
  for (let i = 0; i < summaryHeaders.length; i++) {
    ws.getColumn(5 + days + 1 + i).width = 11
  }

  // ——— CLAVES ———
  const wsClaves = wb.addWorksheet('CLAVES')
  wsClaves.addRow([`CLAVES — ${service}`])
  wsClaves.getRow(1).font = { bold: true, size: 12, color: { argb: 'FF1C3A5C' } }
  wsClaves.addRow(['CÓDIGO', 'DESCRIPCIÓN', 'HORARIO', 'HORAS', 'GRUPO', 'NOTA'])
  const claveHeader = wsClaves.getRow(2)
  claveHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  claveHeader.eachCell((c) => {
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E7D84' },
    }
    c.border = thinBorder()
  })
  for (const s of shifts) {
    const r = wsClaves.addRow([
      s.code,
      s.label,
      s.timeRange ?? '',
      s.hours,
      s.group,
      s.note ?? '',
    ])
    r.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: argb(s.color) },
    }
    if (s.text) {
      r.getCell(1).font = { bold: true, color: { argb: argb(s.text) } }
    }
    r.eachCell((c) => {
      c.border = thinBorder()
    })
  }
  wsClaves.columns = [
    { width: 8 },
    { width: 36 },
    { width: 16 },
    { width: 8 },
    { width: 10 },
    { width: 28 },
  ]

  // ——— DISTRIBUCION ———
  const dist = coverageByDay(doc)
  const wsDist = wb.addWorksheet('DISTRIBUCION')
  wsDist.addRow([`DISTRIBUCIÓN DE COBERTURA — ${period}`])
  wsDist.getRow(1).font = { bold: true, size: 12 }
  wsDist.addRow([
    'DÍA',
    'LETRA',
    'PERSONAL CON TURNO',
    'HORAS CUBIERTAS',
    'MÍN. PERSONAL',
    'ALERTA',
  ])
  wsDist.getRow(2).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  wsDist.getRow(2).eachCell((c) => {
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1C3A5C' },
    }
  })
  for (const d of dist) {
    const low = d.count < doc.coverageRule.minStaffPerDay
    const r = wsDist.addRow([
      d.day,
      weekdayLetter(doc.year, doc.month, d.day),
      d.count,
      d.hours,
      doc.coverageRule.minStaffPerDay,
      low ? 'BAJA' : 'OK',
    ])
    if (low) {
      r.eachCell((c) => {
        c.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8D7D7' },
        }
      })
    }
  }
  wsDist.columns = [
    { width: 6 },
    { width: 8 },
    { width: 18 },
    { width: 16 },
    { width: 14 },
    { width: 10 },
  ]

  // ——— IMPRIMIR (hoja lista para impresión / PDF) ———
  const wsPrint = wb.addWorksheet('IMPRIMIR', {
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      paperSize: 9,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2,
      },
    },
  })
  // Copiar contenido esencial del HORARIO a IMPRIMIR
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const target = wsPrint.getRow(rowNumber)
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const t = target.getCell(colNumber)
      t.value = cell.value
      if (cell.fill && typeof cell.fill === 'object' && 'fgColor' in (cell.fill as object)) {
        t.fill = cell.fill
      }
      if (cell.font) t.font = { ...cell.font }
      if (cell.border) t.border = cell.border
      if (cell.alignment) t.alignment = cell.alignment
    })
    target.height = row.height
  })
  ws.columns.forEach((col, i) => {
    if (col.width) wsPrint.getColumn(i + 1).width = col.width
  })
  // Reaplicar merges del encabezado
  try {
    wsPrint.mergeCells(1, 1, 1, colCount)
    wsPrint.mergeCells(2, 1, 2, colCount)
    wsPrint.mergeCells(3, 1, 3, colCount)
    wsPrint.mergeCells(4, 1, 4, colCount)
  } catch {
    // merges ya aplicados o hoja vacía
  }

  // Contingencia en IMPRIMIR al final
  let printEnd = wsPrint.lastRow?.number ?? 1
  printEnd += 2
  wsPrint.getCell(printEnd, 1).value = 'PLAN DE CONTINGENCIA'
  wsPrint.getCell(printEnd, 1).font = { bold: true }
  wsPrint.getCell(printEnd, 2).value = doc.contingencyPlan
  printEnd += 1
  wsPrint.getCell(printEnd, 1).value = 'OBSERVACIONES'
  wsPrint.getCell(printEnd, 2).value = doc.notes

  const buf = await wb.xlsx.writeBuffer()
  const filename = `Horario_${service}_${doc.unitName.replace(/\s+/g, '_')}_${doc.year}-${String(doc.month).padStart(2, '0')}.xlsx`
  const blob = new Blob([buf as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
