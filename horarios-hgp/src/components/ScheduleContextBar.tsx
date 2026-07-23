import type { ScheduleDoc, ServiceType } from '../types'
import { MONTHS_ES } from '../types'
import { SERVICE_LABEL } from '../data/templates'

type Props = {
  doc: ScheduleDoc
  namedStaff: number
  emptySlots: number
  staffOk: boolean
  canCreate: boolean
  readOnly: boolean
  onCreate: () => void
  onEditNames: () => void
  onAddStaff: (n: number) => void
}

/** Franja única: qué horario está abierto + acciones de personal. */
export function ScheduleContextBar({
  doc,
  namedStaff,
  emptySlots,
  staffOk,
  canCreate,
  readOnly,
  onCreate,
  onEditNames,
  onAddStaff,
}: Props) {
  return (
    <section className="no-print mb-4 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 bg-gradient-to-r from-teal/[0.07] to-navy/[0.04] px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {SERVICE_LABEL[doc.serviceType]}
          </p>
          <h2 className="font-display text-xl text-navy sm:text-2xl">
            {doc.unitName}
            <span className="font-sans text-base font-normal text-muted">
              {' '}
              · {MONTHS_ES[doc.month - 1]} {doc.year}
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted">
            <strong className="text-navy">{namedStaff}</strong> con nombre ·{' '}
            {doc.staff.length} filas
            {emptySlots > 0 ? ` · ${emptySlots} por completar` : ''}
            {!staffOk && (
              <span className="ml-2 font-semibold text-rose-700">
                Falta al menos 1 especialista
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="rounded-xl bg-navy px-3.5 py-2 text-sm font-semibold text-white hover:bg-navy-deep"
            >
              + Crear
            </button>
          )}
          {canCreate && !readOnly && (
            <button
              type="button"
              onClick={onEditNames}
              className="rounded-xl bg-teal px-3.5 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              Nombres
            </button>
          )}
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={() => onAddStaff(1)}
                className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-sand"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => onAddStaff(5)}
                className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-sand"
              >
                +5
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
