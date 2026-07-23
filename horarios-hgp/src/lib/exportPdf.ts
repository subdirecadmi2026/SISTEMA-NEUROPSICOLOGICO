import { jsPDF } from 'jspdf'
import type { ScheduleDoc } from '../types'
import { MONTHS_ES, STATUS_LABEL } from '../types'
import {
  cellKey,
  daysInMonth,
  plannedHours,
  weekdayLetter,
} from './calendar'
import { SERVICE_LABEL } from '../data/templates'
import { formatHolidaysLabel } from './holidays'

function safeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

/** Nombre de archivo PDF institucional. */
export function pdfFileName(doc: ScheduleDoc): string {
  const period = `${doc.year}-${String(doc.month).padStart(2, '0')}`
  return `${safeName(doc.unitName)} ${period}.pdf`
}

/** Carpeta = especialidad / servicio. */
export function specialtyFolderName(doc: ScheduleDoc): string {
  return safeName(doc.unitName) || 'Sin-servicio'
}

/**
 * Genera PDF A4 horizontal del horario (tabla compacta).
 */
export async function buildSchedulePdfBlob(doc: ScheduleDoc): Promise<Blob> {
  const days = daysInMonth(doc.year, doc.month)
  const staff = [...doc.staff]
    .filter((s) => s.name.trim())
    .sort((a, b) => a.order - b.order)

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 6
  let y = margin

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(28, 58, 92)
  pdf.text('Hospital General Puyo — MSP Ecuador', margin, y)
  y += 5
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(40, 40, 40)
  pdf.text(
    `${SERVICE_LABEL[doc.serviceType]} · ${doc.unitName} · ${MONTHS_ES[doc.month - 1]} ${doc.year}`,
    margin,
    y,
  )
  y += 4
  pdf.setFontSize(8)
  pdf.setTextColor(90, 90, 90)
  pdf.text(
    `Estado: ${STATUS_LABEL[doc.status]} · Jefe: ${doc.jefeServicio || '—'} · Feriados: ${formatHolidaysLabel(doc.year, doc.month) || '—'}`,
    margin,
    y,
  )
  y += 5

  if (staff.length === 0) {
    pdf.text('Sin personal con nombre en este horario.', margin, y)
    return pdf.output('blob')
  }

  const nameCol = 42
  const hoursCol = 12
  const usable = pageW - margin * 2 - nameCol - hoursCol
  const dayW = Math.min(usable / days, 7.2)
  const rowH = Math.max(4.2, Math.min(5.5, (pageH - y - 18) / (staff.length + 2)))
  const tableW = nameCol + days * dayW + hoursCol

  // Header days
  pdf.setFillColor(28, 58, 92)
  pdf.rect(margin, y, tableW, rowH, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(6)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Personal', margin + 1, y + rowH * 0.68)
  for (let d = 1; d <= days; d++) {
    const x = margin + nameCol + (d - 1) * dayW
    const letter = weekdayLetter(doc.year, doc.month, d)
    pdf.text(String(d), x + dayW / 2, y + rowH * 0.42, { align: 'center' })
    pdf.setFont('helvetica', 'normal')
    pdf.text(letter, x + dayW / 2, y + rowH * 0.82, { align: 'center' })
    pdf.setFont('helvetica', 'bold')
  }
  pdf.text('H', margin + nameCol + days * dayW + hoursCol / 2, y + rowH * 0.68, {
    align: 'center',
  })
  y += rowH

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(5.5)

  for (let i = 0; i < staff.length; i++) {
    if (y + rowH > pageH - 12) {
      pdf.addPage()
      y = margin
    }
    const s = staff[i]
    const bg = i % 2 === 0 ? [255, 255, 255] : [243, 239, 230]
    pdf.setFillColor(bg[0], bg[1], bg[2])
    pdf.setDrawColor(200, 210, 220)
    pdf.rect(margin, y, tableW, rowH, 'FD')
    pdf.setTextColor(30, 40, 50)
    const label = `${s.fun} ${s.name}`.slice(0, 28)
    pdf.text(label, margin + 1, y + rowH * 0.68)
    for (let d = 1; d <= days; d++) {
      const code = doc.cells[cellKey(s.id, d)] ?? ''
      const x = margin + nameCol + (d - 1) * dayW
      if (code) {
        pdf.setFont('helvetica', 'bold')
        pdf.text(code.slice(0, 4), x + dayW / 2, y + rowH * 0.68, {
          align: 'center',
        })
        pdf.setFont('helvetica', 'normal')
      }
    }
    const hrs = plannedHours(doc, s.id)
    pdf.text(
      String(hrs),
      margin + nameCol + days * dayW + hoursCol / 2,
      y + rowH * 0.68,
      { align: 'center' },
    )
    y += rowH
  }

  y += 4
  pdf.setFontSize(7)
  pdf.setTextColor(90, 90, 90)
  pdf.text(
    `Validado · ${new Date().toLocaleString('es-EC')} · Generado por Horarios HGP`,
    margin,
    Math.min(y, pageH - 4),
  )

  return pdf.output('blob')
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
