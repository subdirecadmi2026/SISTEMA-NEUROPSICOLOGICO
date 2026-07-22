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

type Props = {
  doc: ScheduleDoc
}

/** Vista lista para impresión / PDF (landscape). */
export function PrintSheet({ doc }: Props) {
  const days = daysInMonth(doc.year, doc.month)
  const isEnf = doc.serviceType === 'enfermeria'
  const staff = [...doc.staff]
    .filter((s) => s.name.trim())
    .sort((a, b) => a.order - b.order)

  return (
    <section className="print-area mb-4 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sand/50 px-4 py-3">
        <div>
          <h2 className="font-display text-xl text-navy">IMPRIMIR</h2>
          <p className="text-sm text-muted">
            Vista de planilla · Estado: {STATUS_LABEL[doc.status]} · Use el botón
            Imprimir / PDF del encabezado
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white"
        >
          Imprimir / Guardar PDF
        </button>
      </div>

      <div className="border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-start gap-3">
          <img
            src="/logo_msp.png"
            alt="MSP"
            className="h-12 w-auto rounded bg-white p-1"
          />
          <div className="text-sm">
            <p className="text-[11px] uppercase tracking-wider text-muted">
              {doc.provincial}
            </p>
            <p className="font-display text-xl text-navy">{doc.hospital}</p>
            <p>{doc.department}</p>
            <p className="mt-1 font-semibold">
              CUADRO DE TRABAJO DE PERSONAL DIRECTO O INDIRECTO
            </p>
            <p className="mt-1">
              Servicio: <strong>{doc.unitName}</strong> · Jefe:{' '}
              <strong>{doc.jefeServicio || '—'}</strong> ·{' '}
              {MONTHS_ES[doc.month - 1].toUpperCase()} {doc.year}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto p-2">
        <table className="w-full min-w-[1200px] border-collapse text-[10px]">
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
                <td className="border border-line px-1 text-center">{idx + 1}</td>
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
                  const code = doc.cells[cellKey(s.id, d)] ?? ''
                  const meta = code ? shiftMeta(doc.serviceType, code) : undefined
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

      <div className="grid gap-3 border-t border-line p-4 text-xs sm:grid-cols-2">
        <div>
          <p className="mb-1 font-semibold text-navy">Feriados {doc.year}</p>
          <p className="text-muted">{formatHolidaysLabel(doc.year)}</p>
          {doc.notes && (
            <>
              <p className="mb-1 mt-3 font-semibold text-navy">Observaciones</p>
              <p>{doc.notes}</p>
            </>
          )}
          {doc.contingencyPlan && (
            <>
              <p className="mb-1 mt-3 font-semibold text-navy">
                Plan de contingencia
              </p>
              <p>{doc.contingencyPlan}</p>
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ['Elaborado', doc.elaboradoPor],
              ['Revisado', doc.revisadoPor],
              ['Aprobado', doc.aprobadoPor],
              ['Talento Humano', doc.talentoHumano],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded border border-line px-2 py-3">
              <p className="text-[10px] uppercase text-muted">{label}</p>
              <p className="mt-6 border-t border-line pt-1 font-medium">
                {value || '________________'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
