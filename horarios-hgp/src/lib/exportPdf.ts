import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { ScheduleDoc } from '../types'
import { InstitutionalPrintBody } from '../components/PrintSheet'

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

function waitFrames(ms = 120): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(resolve, ms)
      })
    })
  })
}

/**
 * Genera PDF A4 horizontal con el mismo formato institucional que imprime el médico
 * (encabezado MSP, grilla, firmas de Jefe / Revisor / Validador).
 */
export async function buildSchedulePdfBlob(doc: ScheduleDoc): Promise<Blob> {
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
  try {
    root.render(createElement(InstitutionalPrintBody, { doc }))
    await waitFrames(180)

    const target =
      (host.querySelector('.print-capture-root') as HTMLElement | null) ?? host

    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1123,
    })

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const imgData = canvas.toDataURL('image/jpeg', 0.93)

    const ratio = Math.min(pageW / canvas.width, pageH / canvas.height)
    const w = canvas.width * ratio
    const h = canvas.height * ratio
    const x = (pageW - w) / 2
    const y = (pageH - h) / 2
    pdf.addImage(imgData, 'JPEG', x, y, w, h)

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
