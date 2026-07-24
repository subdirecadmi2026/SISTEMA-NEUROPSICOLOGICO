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
import { formatHolidaysLabel } from '../lib/holidays'
import { SignatureStampBox } from './SignatureStampBox'
import { buildPrintSignatureBoxes } from '../lib/signersStore'

type Props = {
  doc: ScheduleDoc
  /** turno = horario consulta; area = distribución por áreas */
  gridMode?: 'turno' | 'area'
}

function mmToPx(mm: number) {
  return (mm * 96) / 25.4
}

/** Área útil A4 landscape (márgenes 5 mm). */
function paperSize() {
  const m = 5
  return { w: mmToPx(297 - m * 2), h: mmToPx(210 - m * 2) }
}

/**
 * Cuerpo institucional del horario (encabezado MSP + grilla + firmas).
 * Usado por impresión del médico y por el PDF del validador.
 */
export function InstitutionalPrintBody({
  doc,
  gridMode = 'turno',
}: Props) {
  const isAreaGrid = gridMode === 'area'
  const days = daysInMonth(doc.year, doc.month)
  const isEnf = doc.serviceType === 'enfermeria'
  const staff = [...doc.staff]
    .filter((s) => s.name.trim())
    .sort((a, b) => a.order - b.order)
  const gridCells = isAreaGrid ? (doc.areaCells ?? {}) : doc.cells

  const boxes = buildPrintSignatureBoxes(doc)
  const signatures = boxes.map((s) => ({
    ...s,
    electronic: s.slot
      ? (doc.electronicSigns ?? []).find((e) => e.slot === s.slot)
      : undefined,
  }))

  const cols =
    signatures.length >= 5
      ? 'grid-cols-5'
      : signatures.length === 4
        ? 'grid-cols-4'
        : signatures.length === 2
          ? 'grid-cols-2'
          : signatures.length === 1
            ? 'grid-cols-1'
            : 'grid-cols-3'

  return (
    <div className="print-capture-root bg-white text-ink">
      <div className="print-header border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-start gap-3">
          <img
            src="/logo_msp.png"
            alt="MSP"
            className="h-12 w-auto rounded bg-white p-1"
            crossOrigin="anonymous"
          />
          <div className="text-sm">
            <p className="text-[11px] uppercase tracking-wider text-muted">
              {doc.provincial}
            </p>
            <p className="print-title font-display text-xl text-navy">
              {doc.hospital}
            </p>
            <p>{doc.department}</p>
            <p className="mt-1 font-semibold">
              {isAreaGrid
                ? 'DISTRIBUCIÓN MÉDICA POR ÁREA DE SERVICIO'
                : 'CUADRO DE TRABAJO DE PERSONAL DIRECTO O INDIRECTO'}
            </p>
            <p className="mt-1">
              Servicio: <strong>{doc.unitName}</strong> · Jefe:{' '}
              <strong>{doc.jefeServicio || '—'}</strong> ·{' '}
              {MONTHS_ES[doc.month - 1].toUpperCase()} {doc.year}
              {doc.llamado ? ' · BAJO LLAMADO' : ''}
              {doc.vacacionesFlag ? ' · VACACIONES' : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="print-table-wrap p-2">
        <table className="print-schedule-table w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-navy text-white">
              <th className="border border-navy px-1 py-1">N°</th>
              <th className="border border-navy px-1 py-1">FUN</th>
              <th className="border border-navy px-1 py-1 text-left">
                Nombres y apellidos
              </th>
              <th className="border border-navy px-1 py-1">Rel. lab.</th>
              <th className="border border-navy px-1 py-1">Cód.</th>
              {Array.from({ length: days }, (_, i) => (
                <th key={i + 1} className="border border-navy px-0 py-1">
                  <div className="text-[8px] font-normal opacity-80">
                    {weekdayLetter(doc.year, doc.month, i + 1)}
                  </div>
                  {i + 1}
                </th>
              ))}
              {isEnf ? (
                <>
                  <th className="border border-navy px-0.5 py-1">Turnos</th>
                  <th className="border border-navy px-0.5 py-1">H.plan</th>
                  <th className="border border-navy px-0.5 py-1">Vac</th>
                  <th className="border border-navy px-0.5 py-1">Total</th>
                </>
              ) : (
                <th className="border border-navy px-0.5 py-1">Horas</th>
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
                <td className="border border-line px-1 text-center">
                  {idx + 1}
                </td>
                <td className="border border-line px-1 text-center font-semibold">
                  {s.fun}
                </td>
                <td className="border border-line px-1 font-medium">{s.name}</td>
                <td className="border border-line px-1">{s.relacionLaboral}</td>
                <td className="border border-line px-1 text-center font-bold">
                  {s.codigoPersonal}
                </td>
                {Array.from({ length: days }, (_, i) => {
                  const d = i + 1
                  const code = gridCells[cellKey(s.id, d)] ?? ''
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
      </div>

      <div className="print-footer grid gap-3 border-t border-line p-4 text-xs sm:grid-cols-2">
        <div>
          <p className="mb-1 font-semibold text-navy">Feriados {doc.year}</p>
          <p className="text-muted">{formatHolidaysLabel(doc.year)}</p>
          {doc.notes ? (
            <>
              <p className="mb-1 mt-3 font-semibold text-navy">Observaciones</p>
              <p className="print-notes-text">{doc.notes}</p>
            </>
          ) : null}
          {doc.contingencyPlan ? (
            <>
              <p className="mb-1 mt-3 font-semibold text-navy">
                Plan de contingencia
              </p>
              <p className="print-notes-text">{doc.contingencyPlan}</p>
            </>
          ) : null}
          <p className="mt-3 text-[10px] text-muted">
            Estado: {STATUS_LABEL[doc.status]} · v{doc.version}
          </p>
        </div>
        <div className={`grid items-stretch gap-2 ${cols}`}>
          {signatures.map((s) => (
            <SignatureStampBox
              key={s.key}
              label={s.label}
              value={s.value}
              designatedName={s.designatedName}
              slot={s.slot}
              electronic={s.electronic}
              scheduleId={doc.id}
              unitName={doc.unitName}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Formato institucional (encabezado navy, firmas, feriados),
 * con escala solo si hace falta para caber en 1 hoja A4 horizontal.
 */
export function PrintSheet({ doc, gridMode = 'turno' }: Props) {
  const days = daysInMonth(doc.year, doc.month)
  const staffCount = doc.staff.filter((s) => s.name.trim()).length
  const rootRef = useRef<HTMLElement>(null)
  const fitRef = useRef<HTMLDivElement>(null)
  const isArea = gridMode === 'area'

  useEffect(() => {
    const root = rootRef.current
    const fit = fitRef.current
    if (!root || !fit) return

    const applyScale = (forPrint: boolean) => {
      fit.style.transform = 'none'
      fit.style.width = '100%'
      fit.style.marginBottom = '0'
      root.style.height = ''

      const paper = paperSize()
      const availW = forPrint
        ? paper.w
        : Math.max(root.clientWidth || paper.w, 1)
      const availH = forPrint ? paper.h : Number.POSITIVE_INFINITY

      const needW = Math.max(fit.scrollWidth, fit.offsetWidth, 1)
      const needH = Math.max(fit.scrollHeight, fit.offsetHeight, 1)
      const scale = Math.min(availW / needW, availH / needH, 1)

      if (scale >= 0.995) {
        fit.style.transform = 'none'
        fit.style.width = '100%'
        fit.style.marginBottom = '0'
        return
      }

      fit.style.transformOrigin = 'top left'
      fit.style.transform = `scale(${scale})`
      fit.style.width = `${100 / scale}%`
      fit.style.marginBottom = `${needH * scale - needH}px`
      if (forPrint) root.style.height = `${needH * scale}px`
    }

    const onScreen = () => requestAnimationFrame(() => applyScale(false))
    const onPrint = () => applyScale(true)

    onScreen()
    const ro = new ResizeObserver(onScreen)
    ro.observe(root)

    const before = () => {
      document.body.dataset.printing = '1'
      onPrint()
    }
    const after = () => {
      delete document.body.dataset.printing
      onScreen()
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)

    return () => {
      ro.disconnect()
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [doc, days, staffCount])

  const handlePrint = () => {
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
      if (scale < 0.995) {
        fit.style.transformOrigin = 'top left'
        fit.style.transform = `scale(${scale})`
        fit.style.width = `${100 / scale}%`
        fit.style.marginBottom = `${needH * scale - needH}px`
        root.style.height = `${needH * scale}px`
      }
    }
    window.print()
  }

  return (
    <section
      ref={rootRef}
      className="print-area mb-4 overflow-hidden rounded-2xl border border-line bg-white shadow-sm"
    >
      <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sand/50 px-4 py-3">
        <div>
          <h2 className="font-display text-xl text-navy">
            {isArea ? 'IMPRIMIR DISTRIBUCIÓN' : 'IMPRIMIR'}
          </h2>
          <p className="text-sm text-muted">
            {isArea
              ? 'Áreas de servicio · 1 hoja A4 horizontal · '
              : 'Formato institucional · 1 hoja A4 horizontal · '}
            {STATUS_LABEL[doc.status]}
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white"
        >
          Imprimir / Guardar PDF
        </button>
      </div>

      <div ref={fitRef} className="print-fit-one-page">
        <InstitutionalPrintBody doc={doc} gridMode={gridMode} />
      </div>
    </section>
  )
}
