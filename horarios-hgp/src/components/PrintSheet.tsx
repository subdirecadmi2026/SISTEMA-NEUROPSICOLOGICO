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
import { holidaysForYear } from '../lib/holidays'
import { SignatureStampBox } from './SignatureStampBox'
import {
  buildAdmisionesSignatureBox,
  buildPrintSignatureBoxes,
} from '../lib/signersStore'

function PrintScheduleIcon() {
  return (
    <span
      className="print-schedule-icon inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-navy ring-1"
      style={{ backgroundColor: '#e8eef4', boxShadow: 'inset 0 0 0 1px #c5d0dc' }}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
        <path d="M3 9.5h18" />
        <path d="M8 2.5v4" />
        <path d="M16 2.5v4" />
        <circle cx="15.25" cy="15.25" r="3.75" />
        <path d="M15.25 13.6v1.75l1.15.7" />
      </svg>
    </span>
  )
}

type Props = {
  doc: ScheduleDoc
  /** turno = horario consulta; area = distribución por áreas */
  gridMode?: 'turno' | 'area'
}

function mmToPx(mm: number) {
  return (mm * 96) / 25.4
}

/** Área útil A4 landscape (márgenes 6 mm, igual que @page). */
function paperSize() {
  const m = 6
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
  const admisionesBox = buildAdmisionesSignatureBox(doc)
  const signatures = boxes.map((s) => ({
    ...s,
    electronic: s.slot
      ? (doc.electronicSigns ?? []).find((e) => e.slot === s.slot)
      : undefined,
  }))
  const admisionesElectronic = (doc.electronicSigns ?? []).find(
    (e) => e.slot === 'admisiones',
  )

  /** Todas las firmas en una sola fila (sin solapes con feriados). */
  const allSigns = [
    ...signatures,
    {
      key: 'admisiones-box',
      label: admisionesBox.label,
      value: admisionesBox.value,
      designatedName: admisionesBox.designatedName,
      slot: admisionesBox.slot,
      electronic: admisionesElectronic,
    },
  ]
  const signCols = Math.min(Math.max(allSigns.length, 1), 6)
  const holidays = holidaysForYear(doc.year)
  const nameColPct = isEnf ? 14 : 15
  const metaCols = 5 + (isEnf ? 4 : 1)
  const dayPct = Math.max(1.55, (100 - nameColPct - 13) / days)

  return (
    <div className="print-capture-root bg-white text-ink">
      <div className="print-header border-b-2 px-3 py-2" style={{ borderColor: '#d0dae4' }}>
        <div className="flex items-start gap-2.5">
          <img
            src="/logo_msp.png"
            alt="MSP"
            className="h-11 w-auto shrink-0 rounded bg-white p-0.5"
            crossOrigin="anonymous"
          />
          <PrintScheduleIcon />
          <div className="min-w-0 flex-1 text-[11px] leading-snug">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
              {doc.provincial}
            </p>
            <p className="print-title font-display text-lg leading-tight text-navy">
              {doc.hospital}
            </p>
            <p className="text-[10px] text-muted">{doc.department}</p>
            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-navy">
              {isAreaGrid
                ? 'Distribución médica por área de servicio'
                : 'Cuadro de trabajo de personal directo o indirecto'}
            </p>
            <p className="mt-0.5 text-[11px]">
              <span className="text-muted">Servicio:</span>{' '}
              <strong>{doc.unitName}</strong>
              <span className="mx-1.5 text-line">|</span>
              <span className="text-muted">Jefe:</span>{' '}
              <strong>{doc.jefeServicio || '—'}</strong>
              <span className="mx-1.5 text-line">|</span>
              <strong>
                {MONTHS_ES[doc.month - 1].toUpperCase()} {doc.year}
              </strong>
              {doc.llamado ? ' · BAJO LLAMADO' : ''}
              {doc.vacacionesFlag ? ' · VACACIONES' : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="print-table-wrap px-2 py-1">
        <table className="print-schedule-table w-full border-collapse text-[10px]">
          <colgroup>
            <col style={{ width: '2.2%' }} />
            <col style={{ width: '3%' }} />
            <col style={{ width: `${nameColPct}%` }} />
            <col style={{ width: '4.5%' }} />
            <col style={{ width: '3.2%' }} />
            {Array.from({ length: days }, (_, i) => (
              <col key={i} style={{ width: `${dayPct}%` }} />
            ))}
            {isEnf ? (
              <>
                <col style={{ width: '3%' }} />
                <col style={{ width: '3%' }} />
                <col style={{ width: '2.4%' }} />
                <col style={{ width: '3.2%' }} />
              </>
            ) : (
              <col style={{ width: '3.8%' }} />
            )}
          </colgroup>
          <thead>
            <tr className="bg-navy text-white">
              <th className="border border-navy px-0.5 py-1 font-semibold">
                N°
              </th>
              <th className="border border-navy px-0.5 py-1 font-semibold">
                FUN
              </th>
              <th className="border border-navy px-1 py-1 text-left font-semibold">
                Nombres y apellidos
              </th>
              <th className="border border-navy px-0.5 py-1 font-semibold">
                Rel. lab.
              </th>
              <th className="border border-navy px-0.5 py-1 font-semibold">
                Cód.
              </th>
              {Array.from({ length: days }, (_, i) => (
                <th
                  key={i + 1}
                  className="border border-navy px-0 py-0.5 font-semibold"
                >
                  <div className="text-[7px] font-medium leading-none opacity-90">
                    {weekdayLetter(doc.year, doc.month, i + 1)}
                  </div>
                  <div className="text-[10px] leading-tight">{i + 1}</div>
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
                  colSpan={metaCols + days}
                  className="border border-line px-3 py-4 text-center text-muted"
                >
                  Sin personal con nombre. Complete la lista antes de imprimir.
                </td>
              </tr>
            )}
            {staff.map((s, idx) => (
              <tr
                key={s.id}
                style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f7f4ee' }}
              >
                <td className="border border-line px-0.5 text-center">
                  {idx + 1}
                </td>
                <td className="border border-line px-0.5 text-center font-semibold">
                  {s.fun}
                </td>
                <td className="border border-line px-1 text-left font-semibold">
                  {s.name}
                </td>
                <td className="border border-line px-0.5 text-center text-[9px]">
                  {s.relacionLaboral}
                </td>
                <td className="border border-line px-0.5 text-center font-bold">
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
                      className="print-day-cell border border-line px-0 text-center text-[10px] font-extrabold leading-none"
                      style={
                        meta
                          ? {
                              backgroundColor: meta.color,
                              color: meta.text,
                            }
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

      <div
        className="print-footer border-t-2 px-2.5 py-1.5 text-[10px]"
        style={{ borderColor: '#d5dee6' }}
      >
        <div
          className="print-holidays mb-1.5 rounded-md px-2 py-1 ring-1 ring-line"
          style={{ backgroundColor: '#f3efe6' }}
        >
          <p className="mb-0.5 text-[8px] font-bold uppercase tracking-wide text-navy">
            Feriados {doc.year}
          </p>
          <div className="flex flex-wrap gap-1">
            {holidays.length === 0 ? (
              <span className="text-muted">Sin feriados registrados</span>
            ) : (
              holidays.map((h) => {
                const [, m, d] = h.date.split('-')
                return (
                  <span
                    key={h.date}
                    className="inline-flex items-center gap-1 rounded border border-line bg-white px-1 py-0.5 text-[8px] leading-tight text-ink"
                  >
                    <strong className="text-navy">
                      {d}/{m}
                    </strong>
                    <span className="text-muted">{h.name}</span>
                  </span>
                )
              })
            )}
          </div>
        </div>

        {(doc.notes || doc.contingencyPlan) && (
          <div className="mb-1.5 grid gap-1.5 grid-cols-2">
            {doc.notes ? (
              <div className="rounded-md border border-line bg-white px-2 py-1">
                <p className="text-[8px] font-bold uppercase tracking-wide text-navy">
                  Observaciones
                </p>
                <p className="print-notes-text mt-0.5 text-[9px] leading-snug text-ink">
                  {doc.notes}
                </p>
              </div>
            ) : (
              <div />
            )}
            {doc.contingencyPlan ? (
              <div className="rounded-md border border-line bg-white px-2 py-1">
                <p className="text-[8px] font-bold uppercase tracking-wide text-navy">
                  Plan de contingencia
                </p>
                <p className="print-notes-text mt-0.5 text-[9px] leading-snug text-ink">
                  {doc.contingencyPlan}
                </p>
              </div>
            ) : null}
          </div>
        )}

        <div
          className="print-signs-row grid items-stretch gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${signCols}, minmax(0, 1fr))`,
          }}
        >
          {allSigns.map((s) => (
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

        <p className="mt-1 text-[8px] text-muted">
          Estado: {STATUS_LABEL[doc.status]} · v{doc.version}
        </p>
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
      // Si no hay selección explícita (Ctrl+P), imprimir solo esta hoja
      if (!document.body.dataset.printOnly) {
        document.body.dataset.printOnly = gridMode
      }
      onPrint()
    }
    const after = () => {
      delete document.body.dataset.printing
      delete document.body.dataset.printOnly
      onScreen()
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)

    return () => {
      ro.disconnect()
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [doc, days, staffCount, gridMode])

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
    document.body.dataset.printing = '1'
    document.body.dataset.printOnly = gridMode
    window.print()
    window.setTimeout(() => {
      delete document.body.dataset.printing
      delete document.body.dataset.printOnly
    }, 800)
  }

  return (
    <section
      ref={rootRef}
      data-print-grid={gridMode}
      className="print-area mb-4 overflow-hidden rounded-2xl border border-line bg-white shadow-sm"
    >
      <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sand/50 px-4 py-3">
        <div>
          <h2 className="font-display text-xl text-navy">
            {isArea ? 'IMPRIMIR DISTRIBUCIÓN' : 'IMPRIMIR HORARIO'}
          </h2>
          <p className="text-sm text-muted">
            {isArea
              ? 'Áreas de servicio · 1 hoja A4 horizontal · '
              : 'Consulta / jornada · 1 hoja A4 horizontal · '}
            {STATUS_LABEL[doc.status]}
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white"
        >
          {isArea ? 'Imprimir solo distribución' : 'Imprimir solo horario'}
        </button>
      </div>

      <div ref={fitRef} className="print-fit-one-page">
        <InstitutionalPrintBody doc={doc} gridMode={gridMode} />
      </div>
    </section>
  )
}
