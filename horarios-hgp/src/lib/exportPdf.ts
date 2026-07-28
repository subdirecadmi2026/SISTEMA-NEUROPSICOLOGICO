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

/** html2canvas no entiende oklab/oklch de Tailwind v4 → convierte a rgb/hex. */
function cssColorToRgb(color: string): string {
  const v = color.trim()
  if (!v || v === 'transparent' || v === 'rgba(0, 0, 0, 0)') return 'transparent'
  if (/^#|^rgba?\(/i.test(v)) return v
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) return '#000000'
  ctx.fillStyle = '#000000'
  ctx.fillStyle = v
  return ctx.fillStyle || '#000000'
}

const COLOR_PROPS = [
  'color',
  'background-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'fill',
  'stroke',
] as const

function sanitizeCssValue(value: string): string | null {
  if (!/oklab|oklch|color-mix\(/i.test(value)) return null
  if (/^(oklab|oklch)\(/i.test(value.trim())) return cssColorToRgb(value)
  // color-mix u otras: no borrar; el bake inline lo corrige
  if (/color-mix\(/i.test(value)) return '#ffffff'
  return cssColorToRgb(value)
}

function sanitizeStyleDeclaration(style: CSSStyleDeclaration) {
  for (const prop of [...style]) {
    const val = style.getPropertyValue(prop)
    if (!val) continue
    const next = sanitizeCssValue(val)
    if (next !== null) {
      style.setProperty(prop, next, style.getPropertyPriority(prop))
    }
  }
}

function sanitizeCssRule(rule: CSSRule) {
  if (rule instanceof CSSStyleRule) {
    sanitizeStyleDeclaration(rule.style)
    return
  }
  const group = rule as CSSGroupingRule
  if ('cssRules' in group) {
    try {
      for (const nested of [...group.cssRules]) sanitizeCssRule(nested)
    } catch {
      /* hojas cross-origin */
    }
  }
}

/** Evita el crash de html2canvas con colores oklab de Tailwind v4. */
function prepareCloneForCapture(sourceRoot: HTMLElement, clonedRoot: HTMLElement) {
  const doc = clonedRoot.ownerDocument

  // 1) Convertir oklab/oklch → rgb (NUNCA transparent: eso dejaba el PDF “sin nada”)
  const convertCssText = (text: string) =>
    text
      .replace(/oklab\([^)]+\)/gi, (m) => cssColorToRgb(m))
      .replace(/oklch\([^)]+\)/gi, (m) => cssColorToRgb(m))

  doc.querySelectorAll('style').forEach((styleEl) => {
    const text = styleEl.textContent ?? ''
    if (!/oklab|oklch|color-mix\(/i.test(text)) return
    styleEl.textContent = convertCssText(text).replace(
      /color-mix\([^)]+\)/gi,
      '#ffffff',
    )
  })

  for (const sheet of [...doc.styleSheets]) {
    try {
      for (const rule of [...sheet.cssRules]) sanitizeCssRule(rule)
    } catch {
      /* ignore */
    }
  }

  // 2) Colores computados del original → inline rgb en el clon
  const srcEls = [sourceRoot, ...sourceRoot.querySelectorAll<HTMLElement>('*')]
  const dstEls = [clonedRoot, ...clonedRoot.querySelectorAll<HTMLElement>('*')]
  const n = Math.min(srcEls.length, dstEls.length)

  for (let i = 0; i < n; i++) {
    const src = srcEls[i]
    const dst = dstEls[i]
    const cs = getComputedStyle(src)
    for (const prop of COLOR_PROPS) {
      const raw = cs.getPropertyValue(prop)
      if (!raw) continue
      dst.style.setProperty(prop, cssColorToRgb(raw), 'important')
    }
    const bgImage = cs.backgroundImage
    if (bgImage && bgImage !== 'none') {
      if (/oklab|oklch|color-mix\(/i.test(bgImage)) {
        dst.style.setProperty('background-image', 'none', 'important')
        dst.style.setProperty(
          'background-color',
          cssColorToRgb(cs.backgroundColor),
          'important',
        )
      }
    }
  }
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
    onclone: (_doc, cloned) => {
      prepareCloneForCapture(target, cloned)
    },
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
  // Anclado arriba (no centrado) para coincidir con la impresión
  const x = (pageW - w) / 2
  const y = 0
  pdf.addImage(imgData, 'JPEG', x, y, w, h)
}

/**
 * Genera PDF A4 horizontal institucional (formato clásico).
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
      await waitForImages(host)
      await waitFrames(80)
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
