import { useRef, useState } from 'react'
import type { ScheduleDoc } from '../types'
import { InstitutionalPrintBody } from './PrintSheet'
import {
  buildSchedulePdfBlob,
  downloadBlob,
  pdfFileName,
} from '../lib/exportPdf'

type Props = {
  doc: ScheduleDoc
  onFlash?: (msg: string) => void
  /** Abrir la vista institucional al montar (útil en validador). */
  defaultOpen?: boolean
}

type PrintKind = 'turno' | 'area'

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
 * Médico: Horario y Distribución con impresión / PDF independientes
 * y descarga completa (pág. 1 horario, pág. 2 distribución).
 */
export function InstitutionalPreview({
  doc,
  onFlash,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [busy, setBusy] = useState<PrintKind | 'ambos' | null>(null)
  const printWrapRef = useRef<HTMLDivElement>(null)
  const isMedico = doc.serviceType === 'medico'
  const showDistribution = isMedico

  async function downloadPdf(kind: PrintKind | 'ambos') {
    setBusy(kind)
    try {
      const grids: Array<'turno' | 'area'> =
        kind === 'ambos'
          ? ['turno', 'area']
          : kind === 'area'
            ? ['area']
            : ['turno']
      const blob = await buildSchedulePdfBlob(doc, { grids })
      downloadBlob(
        blob,
        pdfFileName(doc, kind === 'ambos' ? 'ambos' : kind),
      )
      onFlash?.(
        kind === 'area'
          ? 'PDF de distribución descargado'
          : kind === 'ambos'
            ? 'PDF completo: pág. 1 horario, pág. 2 distribución'
            : 'PDF de horario descargado',
      )
    } catch (e) {
      onFlash?.(
        e instanceof Error ? e.message : 'No se pudo generar el PDF',
      )
    } finally {
      setBusy(null)
    }
  }

  async function printOnly(kind: PrintKind | 'ambos') {
    setOpen(true)
    await new Promise((r) => setTimeout(r, 80))
    await waitForQrImages(printWrapRef.current)
    document.body.dataset.printing = '1'
    if (kind === 'ambos') {
      delete document.body.dataset.printOnly
    } else {
      document.body.dataset.printOnly = kind
    }
    window.print()
    window.setTimeout(() => {
      delete document.body.dataset.printing
      delete document.body.dataset.printOnly
    }, 800)
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
              ? 'Horario y distribución · cada uno en 1 hoja · PDF completo = 2 páginas'
              : 'Firmas con código QR · mismo formato que imprime el médico'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showDistribution ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void downloadPdf('ambos')}
              className="rounded-xl bg-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy === 'ambos'
                ? 'Generando…'
                : 'Descargar horario completo'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:bg-sand"
          >
            {open ? 'Ocultar vista' : 'Ver planilla institucional'}
          </button>
        </div>
      </div>

      <div
        ref={printWrapRef}
        className={`print-root ${open ? '' : 'print-sheet-offscreen'}`.trim()}
        aria-hidden={!open}
      >
        <div className="print-stack space-y-6 bg-white p-2">
          <div className="no-print mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-sand/30 px-3 py-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                {isMedico ? 'Horario (consulta / jornada)' : 'Planilla'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void downloadPdf('turno')}
                className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {busy === 'turno' ? 'Generando…' : 'PDF horario'}
              </button>
              <button
                type="button"
                onClick={() => void printOnly('turno')}
                className="rounded-lg border border-teal/40 bg-teal px-3 py-1.5 text-xs font-semibold text-white"
              >
                Imprimir horario
              </button>
            </div>
          </div>
          <div
            data-print-grid="turno"
            className="print-area print-sheet-page overflow-x-auto bg-white"
          >
            <div className="print-fit-one-page">
              <InstitutionalPrintBody doc={doc} gridMode="turno" />
            </div>
          </div>

          {showDistribution ? (
            <>
              <div className="no-print mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal/30 bg-teal/5 px-3 py-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal">
                    Distribución (áreas de servicio)
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void downloadPdf('area')}
                    className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {busy === 'area' ? 'Generando…' : 'PDF distribución'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void printOnly('area')}
                    className="rounded-lg border border-teal/40 bg-teal px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Imprimir distribución
                  </button>
                </div>
              </div>
              <div
                data-print-grid="area"
                className="print-area print-sheet-page overflow-x-auto bg-white"
              >
                <div className="print-fit-one-page">
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
