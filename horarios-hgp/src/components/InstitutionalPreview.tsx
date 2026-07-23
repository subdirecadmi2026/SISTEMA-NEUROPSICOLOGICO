import { useState } from 'react'
import type { ScheduleDoc } from '../types'
import { InstitutionalPrintBody } from './PrintSheet'
import { buildSchedulePdfBlob, downloadBlob, pdfFileName } from '../lib/exportPdf'

type Props = {
  doc: ScheduleDoc
  onFlash?: (msg: string) => void
}

/**
 * Vista institucional + descarga PDF (revisor / validador / impresión previa).
 */
export function InstitutionalPreview({ doc, onFlash }: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

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

  function printNow() {
    setOpen(true)
    window.setTimeout(() => window.print(), 220)
  }

  return (
    <section className="no-print mb-6 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sand/40 px-4 py-3">
        <div>
          <h2 className="font-display text-lg text-navy">
            Formato institucional
          </h2>
          <p className="text-xs text-muted">
            Mismo encabezado y firmas que imprime el médico / PDF del validador
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
            onClick={printNow}
            className="rounded-xl border border-teal/40 bg-teal/10 px-3 py-1.5 text-xs font-semibold text-navy"
          >
            Imprimir
          </button>
        </div>
      </div>
      {open && (
        <div className="print-area overflow-x-auto bg-white p-2">
          <div className="print-fit-one-page min-w-[900px]">
            <InstitutionalPrintBody doc={doc} />
          </div>
        </div>
      )}
    </section>
  )
}
