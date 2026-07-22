import type { ServiceType, StaffMember } from '../types'
import { uid } from '../types'
import { createEmptyStaff } from './staffLibrary'

const HEADERS = [
  'FUN',
  'Nombres y Apellidos',
  'Relación Laboral',
  'Código',
  'Sección',
  'Cargo',
] as const

export async function downloadStaffTemplate(
  serviceType: ServiceType,
  unitName: string,
) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Horarios HGP'
  const ws = wb.addWorksheet('Personal')
  ws.columns = [
    { header: 'FUN', key: 'fun', width: 8 },
    { header: 'Nombres y Apellidos', key: 'name', width: 32 },
    { header: 'Relación Laboral', key: 'relacion', width: 18 },
    { header: 'Código', key: 'codigo', width: 10 },
    { header: 'Sección', key: 'section', width: 36 },
    { header: 'Cargo', key: 'role', width: 22 },
  ]
  const header = ws.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1C3A5C' },
  }

  const isEnf = serviceType === 'enfermeria'
  ws.addRow({
    fun: isEnf ? 'ENF' : 'MED',
    name: isEnf ? 'Lic. Ejemplo Apellido' : 'Dr. Ejemplo Apellido',
    relacion: 'LOSEP',
    codigo: isEnf ? 'D1' : 'CE',
    section: isEnf
      ? 'Enfermeras/os y Auxiliar de Enfermería'
      : 'Personal médico',
    role: isEnf ? 'Enfermera' : 'Médico tratante',
  })
  if (isEnf) {
    ws.addRow({
      fun: 'AUX',
      name: 'Aux. Ejemplo Apellido',
      relacion: 'Código de Trabajo',
      codigo: 'M',
      section: 'Auxiliar de Enfermería',
      role: 'Auxiliar de enfermería',
    })
    ws.addRow({
      fun: 'INT',
      name: 'Int. Ejemplo Apellido',
      relacion: 'Internado',
      codigo: 'T',
      section: 'Internos de Enfermería',
      role: 'Interno de enfermería',
    })
  }

  const buf = await wb.xlsx.writeBuffer()
  triggerDownload(
    buf as ArrayBuffer,
    `Plantilla_Personal_${serviceType}_${unitName.replace(/\s+/g, '_')}.xlsx`,
  )
}

function triggerDownload(buf: ArrayBuffer, filename: string) {
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function normalizeHeader(v: unknown): string {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

type CellLike = { value: unknown }
type RowLike = {
  eachCell: (cb: (cell: CellLike, col: number) => void) => void
  getCell: (col: number) => CellLike
}

function mapHeaderIndex(row: RowLike): Record<string, number> {
  const map: Record<string, number> = {}
  row.eachCell((cell, col) => {
    const h = normalizeHeader(cell.value)
    if (h.includes('fun')) map.fun = col
    else if (h.includes('nombre')) map.name = col
    else if (h.includes('relacion')) map.relacion = col
    else if (h.includes('codigo') || h === 'cod') map.codigo = col
    else if (h.includes('seccion')) map.section = col
    else if (h.includes('cargo') || h.includes('rol')) map.role = col
  })
  return map
}

export async function parseStaffFile(
  file: File,
  serviceType: ServiceType,
  unitName: string,
): Promise<StaffMember[]> {
  const name = file.name.toLowerCase()

  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const text = await file.text()
    return parseStaffCsv(text, serviceType, unitName)
  }

  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const buf = await file.arrayBuffer()
  await wb.xlsx.load(buf)
  const ws = wb.worksheets[0]
  if (!ws) return []

  const headerRow = ws.getRow(1)
  const idx = mapHeaderIndex(headerRow as unknown as RowLike)
  const funCol = idx.fun ?? 1
  const nameCol = idx.name ?? 2
  const relCol = idx.relacion ?? 3
  const codCol = idx.codigo ?? 4
  const secCol = idx.section ?? 5
  const roleCol = idx.role ?? 6

  const out: StaffMember[] = []
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const nameVal = String(row.getCell(nameCol).value ?? '').trim()
    if (!nameVal) return
    const base = createEmptyStaff(serviceType, unitName)
    out.push({
      ...base,
      id: uid(serviceType === 'enfermeria' ? 'enf' : 'med'),
      fun: String(row.getCell(funCol).value ?? base.fun)
        .trim()
        .toUpperCase(),
      name: nameVal,
      relacionLaboral: String(
        row.getCell(relCol).value ?? base.relacionLaboral,
      ).trim(),
      codigoPersonal: String(row.getCell(codCol).value ?? base.codigoPersonal)
        .trim()
        .toUpperCase(),
      section: String(row.getCell(secCol).value ?? base.section).trim(),
      role: String(row.getCell(roleCol).value ?? base.role).trim(),
      order: out.length + 1,
    })
  })
  return out
}

function parseStaffCsv(
  text: string,
  serviceType: ServiceType,
  unitName: string,
): StaffMember[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return []

  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(normalizeHeader)
  const find = (...keys: string[]) =>
    headers.findIndex((h) => keys.some((k) => h.includes(k)))

  const iFun = find('fun')
  const iName = find('nombre')
  const iRel = find('relacion')
  const iCod = find('codigo', 'cod')
  const iSec = find('seccion')
  const iRole = find('cargo', 'rol')

  const out: StaffMember[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map((c) => c.replace(/^"|"$/g, '').trim())
    const nameVal = cols[iName >= 0 ? iName : 1] ?? ''
    if (!nameVal) continue
    const base = createEmptyStaff(serviceType, unitName)
    out.push({
      ...base,
      id: uid(serviceType === 'enfermeria' ? 'enf' : 'med'),
      fun: (cols[iFun >= 0 ? iFun : 0] ?? base.fun).toUpperCase(),
      name: nameVal,
      relacionLaboral: cols[iRel >= 0 ? iRel : 2] ?? base.relacionLaboral,
      codigoPersonal: (
        cols[iCod >= 0 ? iCod : 3] ?? base.codigoPersonal
      ).toUpperCase(),
      section: cols[iSec >= 0 ? iSec : 4] ?? base.section,
      role: cols[iRole >= 0 ? iRole : 5] ?? base.role,
      order: out.length + 1,
    })
  }
  return out
}

export { HEADERS }
