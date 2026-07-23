import type { ScheduleDoc } from '../types'
import { MONTHS_ES } from '../types'
import {
  cellKey,
  daysInMonth,
  plannedHours,
  weekdayLetter,
} from './calendar'
import { hoursForCode } from '../data/templates'

/** Exporta una grilla simple CSV (UTF-8 BOM) para Excel. */
export function buildScheduleCsv(doc: ScheduleDoc): string {
  const days = daysInMonth(doc.year, doc.month)
  const staff = [...doc.staff]
    .filter((s) => s.name.trim())
    .sort((a, b) => a.order - b.order)

  const header = [
    'N°',
    'FUN',
    'Nombres',
    'Rel. laboral',
    'Código',
    ...Array.from({ length: days }, (_, i) => {
      const d = i + 1
      return `${weekdayLetter(doc.year, doc.month, d)}${d}`
    }),
    'Horas',
  ]

  const lines = [header.join(';')]
  staff.forEach((s, idx) => {
    const row = [
      String(idx + 1),
      csvEscape(s.fun),
      csvEscape(s.name),
      csvEscape(s.relacionLaboral),
      csvEscape(s.codigoPersonal),
      ...Array.from({ length: days }, (_, i) =>
        csvEscape(doc.cells[cellKey(s.id, i + 1)] ?? ''),
      ),
      String(plannedHours(doc, s.id)),
    ]
    lines.push(row.join(';'))
  })

  // fila resumen de horas/día
  const dayHours = Array.from({ length: days }, (_, i) => {
    const d = i + 1
    let h = 0
    for (const s of staff) {
      const code = doc.cells[cellKey(s.id, d)]
      if (code) h += hoursForCode(doc.serviceType, code)
    }
    return String(h)
  })
  lines.push(
    ['', '', 'TOTAL HORAS DÍA', '', '', ...dayHours, ''].join(';'),
  )

  return `\uFEFF${lines.join('\n')}`
}

function csvEscape(v: string): string {
  if (/[;"\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

export function downloadScheduleCsv(doc: ScheduleDoc) {
  const csv = buildScheduleCsv(doc)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Horario_${doc.unitName.replace(/\s+/g, '_')}_${MONTHS_ES[doc.month - 1]}_${doc.year}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
