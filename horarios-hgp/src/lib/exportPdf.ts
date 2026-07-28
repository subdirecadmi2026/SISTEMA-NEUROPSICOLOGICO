import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { ScheduleDoc } from '../types'
import { InstitutionalPrintBody } from '../components/PrintSheet'
import { ensureElectronicQr } from './signatureQr'

/** A4 landscape a 96 dpi (mismo criterio que la hoja de impresión). */
const PAGE_W_PX = Math.round((297 * 96) / 25.4) // ≈1123
const MARGIN_MM = 5

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

async function waitForImages(root: HTMLElement, timeoutMs = 2500) {
  const imgs = [...root.querySelectorAll('img')]
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve()
            return
          }
          const done = () => resolve()
          img.addEventListener('load', done, { once: true })
          img.addEventListener('error', done, { once: true })
          window.setTimeout(done, timeoutMs)
        }),
    ),
  )
}

async function captureRoot(host: HTMLElement): Promise<HTMLCanvasElement> {
  const target =
    (host.querySelector('.print-capture-root') as HTMLElement | null) ?? host
  const w = PAGE_W_PX
  const h = Math.ceil(
    Math.max(target.scrollHeight, target.offsetHeight, 1),
  )
  host.style.height = `${h}px`

  return html2canvas(target, {
    scale: 3,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: w,
    height: h,
    windowWidth: w,
    windowHeight: h,
    onclone: (_doc, cloned) => {
      cloned.querySelectorAll<HTMLElement>('.print-day-cell').forEach((td) => {
        td.style.setProperty('-webkit-print-color-adjust', 'exact')
        td.style.setProperty('print-color-adjust', 'exact')
        td.style.fontWeight = '800'
      })
    },
  })
}

function addCanvasPage(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  isFirst: boolean,
) {
  if (!isFirst) pdf.addPage('a4', 'landscape')
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  // PNG: texto nítido (JPEG difumina códigos de turno)
  const imgData = canvas.toDataURL('image/png')
  const usableW = pageW - MARGIN_MM * 2
  const usableH = pageH - MARGIN_MM * 2
  const ratio = Math.min(usableW / canvas.width, usableH / canvas.height)
  const w = canvas.width * ratio
  const h = canvas.height * ratio
  const x = MARGIN_MM + (usableW - w) / 2
  const y = MARGIN_MM
  pdf.addImage(imgData, 'PNG', x, y, w, h)
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
    `width:${PAGE_W_PX}px`,
    'background:#ffffff',
    'z-index:-1',
    'pointer-events:none',
    'overflow:hidden',
  ].join(';')
  document.body.appendChild(host)

  const root = createRoot(host)
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })
  // Garantiza A4 horizontal aunque el viewer ignore metadata
  if (pdf.internal.pageSize.getWidth() < pdf.internal.pageSize.getHeight()) {
    pdf.setPage(1)
  }

  try {
    for (let i = 0; i < modes.length; i++) {
      const mode = modes[i]
      root.render(
        createElement(InstitutionalPrintBody, {
          doc: enriched,
          gridMode: mode,
        }),
      )
      await waitFrames(i === 0 ? 420 : 320)
      await waitForImages(host)
      await waitFrames(100)
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
