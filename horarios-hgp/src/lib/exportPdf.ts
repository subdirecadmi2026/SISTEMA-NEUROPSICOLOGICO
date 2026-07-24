import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { ScheduleDoc } from '../types'
import { InstitutionalPrintBody } from '../components/PrintSheet'
import { ensureElectronicQr } from './signatureQr'

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
export function pdfFileName(
  doc: ScheduleDoc,
  kind: 'turno' | 'area' | 'ambos' = 'turno',
): string {
  const period = `${doc.year}-${String(doc.month).padStart(2, '0')}`
  const suffix =
    kind === 'area'
      ? ' distribucion'
      : kind === 'ambos'
        ? ' horario-distribucion'
        : ' horario'
  return `${safeName(doc.unitName)}${suffix} ${period}.pdf`
}

/** Carpeta = especialidad / servicio. */
export function specialtyFolderName(doc: ScheduleDoc): string {
  return safeName(doc.unitName) || 'Sin-servicio'
}

function waitFrames(ms = 120): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(resolve, ms)
      })
    })
  })
}

async function enrichSigns(doc: ScheduleDoc): Promise<ScheduleDoc> {
  const signs = doc.electronicSigns ?? []
  if (!signs.length) return doc
  const withQr = await Promise.all(
    signs.map((s) =>
      ensureElectronicQr(s, { scheduleId: doc.id, unitName: doc.unitName }),
    ),
  )
  return { ...doc, electronicSigns: withQr }
}

async function captureRoot(host: HTMLElement): Promise<HTMLCanvasElement> {
  const target =
    (host.querySelector('.print-capture-root') as HTMLElement | null) ?? host
  return html2canvas(target, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: 1123,
  })
}

function addCanvasPage(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  isFirst: boolean,
) {
  if (!isFirst) pdf.addPage()
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const imgData = canvas.toDataURL('image/jpeg', 0.93)
  const ratio = Math.min(pageW / canvas.width, pageH / canvas.height)
  const w = canvas.width * ratio
  const h = canvas.height * ratio
  const x = (pageW - w) / 2
  const y = (pageH - h) / 2
  pdf.addImage(imgData, 'JPEG', x, y, w, h)
}

/**
 * Genera PDF A4 horizontal institucional.
 * `grids`: qué hojas incluir (turno, área o ambas).
 */
export async function buildSchedulePdfBlob(
  doc: ScheduleDoc,
  opts?: { grids?: Array<'turno' | 'area'> },
): Promise<Blob> {
  const enriched = await enrichSigns(doc)
  const defaultModes: Array<'turno' | 'area'> =
    doc.serviceType === 'medico' ? ['turno', 'area'] : ['turno']
  const modes = opts?.grids?.length ? opts.grids : defaultModes

  const host = document.createElement('div')
  host.setAttribute('data-pdf-capture', '1')
  host.style.cssText = [
    'position:fixed',
    'left:-12000px',
    'top:0',
    'width:1123px',
    'background:#ffffff',
    'z-index:-1',
    'pointer-events:none',
  ].join(';')
  document.body.appendChild(host)

  const root = createRoot(host)
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  try {
    for (let i = 0; i < modes.length; i++) {
      const mode = modes[i]
      root.render(
        createElement(InstitutionalPrintBody, {
          doc: enriched,
          gridMode: mode,
        }),
      )
      await waitFrames(i === 0 ? 350 : 280)
      const canvas = await captureRoot(host)
      addCanvasPage(pdf, canvas, i === 0)
    }
    return pdf.output('blob')
  } finally {
    root.unmount()
    host.remove()
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Convierte Blob PDF a base64 (sin prefijo data:) para la API FirmaEC. */
export async function blobToPdfBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}
