import { useEffect, useRef } from 'react'
import type { ScheduleDoc } from '../types'
import { MONTHS_ES, STATUS_LABEL } from '../types'
import {
  cellKey,
  countCodeForStaff,
  daysInMonth,
  plannedHours,
  plannedShifts,
  totalPaidHours,
  weekdayLetter,
} from '../lib/calendar'
import { shiftMeta } from '../data/templates'

type Props = {
  doc: ScheduleDoc
}

/** mm → px (96 dpi, estándar CSS). */
function mmToPx(mm: number) {
  return (mm * 96) / 25.4
}

/** Área útil de A4 landscape con márgenes de impresión. */
function paperSize() {
  const marginMm = 4
  return {
    w: mmToPx(297 - marginMm * 2),
    h: mmToPx(210 - marginMm * 2),
  }
}

/**
 * Planilla que escala (transform + colapso de layout) para caber
 * en una sola hoja A4 horizontal al imprimir / PDF.
 */
export function PrintSheet({ doc }: Props) {
  const days = daysInMonth(doc.year, doc.month)
  const isEnf = doc.serviceType === 'enfermeria'
  const staff = [...doc.staff]
    .filter((s) => s.name.trim())
    .sort((a, b) => a.order - b.order)
  const rootRef = useRef<HTMLElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const fit = fitRef.current
    if (!root || !fit) return

    const scaleToFit = (forPrint: boolean) => {
      // Reset para medir tamaño natural
      fit.style.transform = 'none'
      fit.style.width = '100%'
      fit.style.height = 'auto'
      fit.style.marginBottom = '0'
      fit.style.zoom = '1'

      const paper = paperSize()
      const availW = forPrint
        ? paper.w
        : Math.max(root.clientWidth || paper.w, 1)
      const availH = forPrint
        ? paper.h
        : Math.max(Math.min(root.clientHeight || paper.h, paper.h), 1)

      const needW = Math.max(fit.scrollWidth, fit.offsetWidth, 1)
      const needH = Math.max(fit.scrollHeight, fit.offsetHeight, 1)
      const scale = Math.min(availW / needW, availH / needH, 1)

      fit.style.transformOrigin = 'top left'
      fit.style.transform = `scale(${scale})`
      // Ancho lógico para que el contenido use todo el ancho disponible
      fit.style.width = `${100 / scale}%`
      // Crítico: transform no reduce el box; colapsar espacio sobrante
      // evita que el navegador genere una 2ª página en blanco/recorte.
      fit.style.marginBottom = `${needH * scale - needH}px`
      root.style.height = forPrint ? `${needH * scale}px` : ''
      root.style.overflow = 'hidden'
    }

    const runScreen = () => requestAnimationFrame(() => scaleToFit(false))
    const runPrint = () => scaleToFit(true)

    runScreen()
    const ro = new ResizeObserver(runScreen)
    ro.observe(root)

    const onBeforePrint = () => {
      document.body.dataset.printing = '1'
      runPrint()
    }
    const onAfterPrint = () => {
      delete document.body.dataset.printing
      runScreen()
    }

    window.addEventListener('beforeprint', onBeforePrint)
    window.addEventListener('afterprint', onAfterPrint)

    // Chrome a veces aplica media print antes del evento
    const mql = window.matchMedia('print')
    const onMql = () => {
      if (mql.matches) runPrint()
      else runScreen()
    }
    mql.addEventListener?.('change', onMql)

    return () => {
      ro.disconnect()
      window.removeEventListener('beforeprint', onBeforePrint)
      window.removeEventListener('afterprint', onAfterPrint)
      mql.removeEventListener?.('change', onMql)
    }
  }, [doc, days, staff.length])

  return (
    <section
      ref={rootRef}
      className="print-area mb-4 overflow-hidden rounded-2xl border border-line bg-white shadow-sm"
    >
      <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sand/50 px-4 py-3">
        <div>
          <h2 className="font-display text-xl text-navy">IMPRIMIR</h2>
          <p className="text-sm text-muted">
            Todo el horario en una sola hoja A4 horizontal ·{' '}
            {STATUS_LABEL[doc.status]}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            // Ajustar a papel justo antes del diálogo
            const fit = fitRef.current
            const root = rootRef.current
            if (fit && root) {
              fit.style.transform = 'none'
              fit.style.width = '100%'
              fit.style.marginBottom = '0'
              const paper = paperSize()
              const needW = Math.max(fit.scrollWidth, 1)
              const needH = Math.max(fit.scrollHeight, 1)
              const scale = Math.min(paper.w / needW, paper.h / needH, 1)
              fit.style.transformOrigin = 'top left'
              fit.style.transform = `scale(${scale})`
              fit.style.width = `${100 / scale}%`
              fit.style.marginBottom = `${needH * scale - needH}px`
              root.style.height = `${needH * scale}px`
            }
            window.print()
          }}
          className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white"
        >
          Imprimir / Guardar PDF
        </button>
      </div>

      <div ref={fitRef} className="print-fit-one-page">
        <div className="print-header border-b border-line px-2 py-1">
          <div className="flex flex-wrap items-start gap-2">
            <img
              src="/logo_msp.png"
              alt="MSP"
              className="h-10 w-auto rounded bg-white p-0.5"
            />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted">
                {doc.provincial}
              </p>
              <h1 className="print-title font-display text-lg leading-tight text-navy">
                {doc.hospital}
              </h1>
              <p className="text-xs text-muted">{doc.department}</p>
              <p className="text-xs font-semibold">
                CUADRO DE TRABAJO DE PERSONAL DIRECTO O INDIRECTO
              </p>
              <p className="text-xs">
                Servicio: <strong>{doc.unitName}</strong> · Jefe:{' '}
                <strong>{doc.jefeServicio || '—'}</strong> ·{' '}
                {MONTHS_ES[doc.month - 1].toUpperCase()} {doc.year}
                {doc.llamado ? ' · LLAMADO' : ''}
                {doc.vacacionesFlag ? ' · VACACIONES' : ''}
              </p>
            </div>
          </div>
        </div>

        <table className="print-schedule-table w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-sand/90">
              <th className="border border-line px-1 py-1">N°</th>
              <th className="border border-line px-1 py-1">FUN</th>
              <th className="border border-line px-1 py-1 text-left">
                Nombres y apellidos
              </th>
              <th className="border border-line px-1 py-1 text-left">
                Rel. laboral
              </th>
              <th className="border border-line px-1 py-1">Cód.</th>
              {Array.from({ length: days }, (_, i) => {
                const d = i + 1
                return (
                  <th
                    key={d}
                    className="border border-line px-0 py-0.5 text-center"
                  >
                    <div className="text-[8px] font-normal text-muted">
                      {weekdayLetter(doc.year, doc.month, d)}
                    </div>
                    <div className="font-semibold">{d}</div>
                  </th>
                )
              })}
              {isEnf ? (
                <>
                  <th className="border border-line px-0.5 py-0.5 text-[8px]">
                    Turnos
                  </th>
                  <th className="border border-line px-0.5 py-0.5 text-[8px]">
                    H. plan.
                  </th>
                  <th className="border border-line px-0.5 py-0.5 text-[8px]">
                    Vac.
                  </th>
                  <th className="border border-line px-0.5 py-0.5 text-[8px]">
                    Total
                  </th>
                </>
              ) : (
                <th className="border border-line px-0.5 py-0.5 text-[8px]">
                  Horas
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 && (
              <tr>
                <td
                  colSpan={5 + days + (isEnf ? 4 : 1)}
                  className="border border-line px-3 py-4 text-center text-muted"
                >
                  Sin personal con nombre. Complete la lista antes de imprimir.
                </td>
              </tr>
            )}
            {staff.map((s, idx) => (
              <tr key={s.id}>
                <td className="border border-line px-1 text-center">{idx + 1}</td>
                <td className="border border-line px-1 text-center font-semibold">
                  {s.fun}
                </td>
                <td className="border border-line px-1 font-medium">{s.name}</td>
                <td className="border border-line px-1 text-muted">
                  {s.relacionLaboral}
                </td>
                <td className="border border-line px-1 text-center font-bold text-navy">
                  {s.codigoPersonal}
                </td>
                {Array.from({ length: days }, (_, i) => {
                  const d = i + 1
                  const code = doc.cells[cellKey(s.id, d)] ?? ''
                  const meta = code
                    ? shiftMeta(doc.serviceType, code)
                    : undefined
                  return (
                    <td
                      key={d}
                      className="border border-line px-0 text-center font-bold"
                      style={
                        meta
                          ? { background: meta.color, color: meta.text }
                          : undefined
                      }
                    >
                      {code}
                    </td>
                  )
                })}
                {isEnf ? (
                  <>
                    <td className="border border-line px-0.5 text-center">
                      {plannedShifts(doc, s.id)}
                    </td>
                    <td className="border border-line px-0.5 text-center">
                      {plannedHours(doc, s.id)}
                    </td>
                    <td className="border border-line px-0.5 text-center">
                      {countCodeForStaff(doc, s.id, 'V')}
                    </td>
                    <td className="border border-line px-0.5 text-center font-bold">
                      {totalPaidHours(doc, s)}
                    </td>
                  </>
                ) : (
                  <td className="border border-line px-0.5 text-center font-bold">
                    {plannedHours(doc, s.id)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="print-footer grid gap-2 border-t border-line p-2 text-[10px] sm:grid-cols-2">
          <div className="print-notes min-w-0">
            <p className="font-semibold text-navy">Observaciones</p>
            <p className="print-notes-text">{doc.notes || '—'}</p>
            <p className="mt-1 font-semibold text-navy">Contingencia</p>
            <p className="print-notes-text">{doc.contingencyPlan || '—'}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['Elaborado', doc.elaboradoPor],
                ['Revisado', doc.revisadoPor],
                ['Aprobado', doc.aprobadoPor],
                ['Talento Humano', doc.talentoHumano],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="print-sign border border-line px-1 py-1">
                <p className="font-semibold text-navy">{label}</p>
                <p>{value || '________________'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
