import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { ElectronicSignRecord, ScheduleDoc } from '../types'
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

async function enrichSigns(doc: ScheduleDoc): Promise<ScheduleDoc> {
  const signs = doc.electronicSigns ?? []
  if (!signs.length) {
    // Generar QR sintético desde textos de casilla para PDF/impresión
    const synthetic: ElectronicSignRecord[] = []
    const pushIf = (
      slot: ElectronicSignRecord['slot'],
      text: string | undefined,
    ) => {
      const name = text?.split('\n')[0]?.split('—')[0]?.trim()
      if (!name) return
      synthetic.push({
        slot,
        subjectCn: name,
        signedAt: doc.updatedAt || new Date().toISOString(),
        method: 'nombre_qr',
        stampText: text || name,
      })
    }
    pushIf('jefe', doc.elaboradoPor)
    pushIf('revisor', doc.revisadoPor || doc.aprobadoPor)
    pushIf('validador', doc.talentoHumano)
    if (!synthetic.length) return doc
    const withQr = await Promise.all(
      synthetic.map((s) =>
        ensureElectronicQr(s, { scheduleId: doc.id, unitName: doc.unitName }),
      ),
    )
    return { ...doc, electronicSigns: withQr }
  }

  const withQr = await Promise.all(
    signs.map((s) =>
      ensureElectronicQr(s, { scheduleId: doc.id, unitName: doc.unitName }),
    ),
  )
  return { ...doc, electronicSigns: withQr }
}

/**
 * Genera PDF A4 horizontal con el mismo formato institucional que imprime el médico
 * (encabezado MSP, grilla, firmas de Jefe / Revisor / Validador con QR).
 */
export async function buildSchedulePdfBlob(doc: ScheduleDoc): Promise<Blob> {
  const enriched = await enrichSigns(doc)

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
    root.render(createElement(InstitutionalPrintBody, { doc: enriched }))
    // Esperar pintado de imágenes QR
    await waitFrames(350)

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
