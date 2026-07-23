import { useRef, useState } from 'react'
import type { ScheduleDoc } from '../types'
import { InstitutionalPrintBody } from './PrintSheet'
import { buildSchedulePdfBlob, downloadBlob, pdfFileName } from '../lib/exportPdf'

type Props = {
  doc: ScheduleDoc
  onFlash?: (msg: string) => void
  /** Abrir la vista institucional al montar (útil en validador). */
  defaultOpen?: boolean
}

async function waitForQrImages(root: HTMLElement | null, ms = 800) {
  if (!root) {
    await new Promise((r) => setTimeout(r, 200))
    return
  }
  const imgs = Array.from(
    root.querySelectorAll<HTMLImageElement>('img.print-sign-qr'),
  )
  if (!imgs.length) {
    await new Promise((r) => setTimeout(r, 280))
    return
  }
  await Promise.race([
    Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve()
              return
            }
            img.onload = () => resolve()
            img.onerror = () => resolve()
          }),
      ),
    ),
    new Promise<void>((r) => setTimeout(r, ms)),
  ])
}

/**
 * Vista institucional + PDF + impresión (revisor / validador).
 * El área imprimible siempre está montada (visible u offscreen).
 * Importante: no envolver el print-area con `.no-print` (rompe la impresión).
 */
export function InstitutionalPreview({
  doc,
  onFlash,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [busy, setBusy] = useState(false)
  const printWrapRef = useRef<HTMLDivElement>(null)

  async function downloadPdf() {
    setBusy(true)
    try {
      const blob = await buildSchedulePdfBlob(doc)
      downloadBlob(blob, pdfFileName(doc))
      onFlash?.('PDF institucional descargado')
    } catch (e) {
      onFlash?.(
        e instanceof Error ? e.message : 'No se pudo generar el PDF',
      )
    } finally {
      setBusy(false)
    }
  }

  async function printNow() {
    setOpen(true)
    await new Promise((r) => setTimeout(r, 80))
    await waitForQrImages(printWrapRef.current)
    document.body.dataset.printing = '1'
    window.print()
    window.setTimeout(() => {
      delete document.body.dataset.printing
    }, 600)
  }

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sand/40 px-4 py-3">
        <div>
          <h2 className="font-display text-lg text-navy">
            Formato institucional
          </h2>
          <p className="text-xs text-muted">
            Firmas con código QR · mismo formato que imprime el médico
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:bg-sand"
          >
            {open ? 'Ocultar vista' : 'Ver planilla institucional'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void downloadPdf()}
            className="rounded-xl bg-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Generando…' : 'Descargar PDF'}
          </button>
          <button
            type="button"
            onClick={() => void printNow()}
            className="rounded-xl border border-teal/40 bg-teal px-3 py-1.5 text-xs font-semibold text-white"
          >
            Imprimir
          </button>
        </div>
      </div>

      {/* Siempre montado: en pantalla offscreen si está cerrado; al imprimir se ve */}
      <div
        ref={printWrapRef}
        className={open ? undefined : 'print-sheet-offscreen'}
        aria-hidden={!open}
      >
        <div className="print-area overflow-x-auto bg-white p-2">
          <div className="print-fit-one-page min-w-[900px]">
            <InstitutionalPrintBody doc={doc} />
          </div>
        </div>
      </div>
    </section>
  )
}
