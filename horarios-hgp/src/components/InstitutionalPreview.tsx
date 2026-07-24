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
 * Médico: muestra Horario y Distribución por separado, cada uno con su formato.
 */
export function InstitutionalPreview({
  doc,
  onFlash,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [busy, setBusy] = useState(false)
  const printWrapRef = useRef<HTMLDivElement>(null)
  const isMedico = doc.serviceType === 'medico'
  const showDistribution =
    isMedico && Object.keys(doc.areaCells ?? {}).length >= 0

  async function downloadPdf() {
    setBusy(true)
    try {
      const blob = await buildSchedulePdfBlob(doc)
      downloadBlob(blob, pdfFileName(doc))
      onFlash?.(
        isMedico
          ? 'PDF institucional (horario + distribución) descargado'
          : 'PDF institucional descargado',
      )
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
            {isMedico
              ? 'Horario y Distribución por separado · firmas con QR'
              : 'Firmas con código QR · mismo formato que imprime el médico'}
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

      <div
        ref={printWrapRef}
        className={open ? undefined : 'print-sheet-offscreen'}
        aria-hidden={!open}
      >
        <div className="print-stack space-y-6 bg-white p-2">
          <div className="no-print mb-1 px-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
              {isMedico ? '1 · Horario (consulta / jornada)' : 'Planilla'}
            </p>
          </div>
          <div className="print-area print-sheet-page overflow-x-auto bg-white">
            <div className="print-fit-one-page min-w-[900px]">
              <InstitutionalPrintBody doc={doc} gridMode="turno" />
            </div>
          </div>

          {showDistribution ? (
            <>
              <div className="no-print mb-1 px-1 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal">
                  2 · Distribución (áreas de servicio)
                </p>
              </div>
              <div className="print-area print-sheet-page overflow-x-auto bg-white">
                <div className="print-fit-one-page min-w-[900px]">
                  <InstitutionalPrintBody doc={doc} gridMode="area" />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  )
}
