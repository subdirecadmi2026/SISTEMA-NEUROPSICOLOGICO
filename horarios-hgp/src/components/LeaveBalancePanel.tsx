import { useMemo } from 'react'
import type { ScheduleDoc } from '../types'
import { LEAVE_KIND_LABEL } from '../lib/leavesStore'
import {
  leaveUsageSummary,
  listLeaveUsagesForDoc,
} from '../lib/leaveValidation'

type Props = {
  doc: ScheduleDoc
  onGoHorario?: () => void
  goLabel?: string
}

/**
 * Panel compacto: balance de vacaciones/permisos vs lo pintado en el mes.
 */
export function LeaveBalancePanel({
  doc,
  onGoHorario,
  goLabel = 'Ir al horario',
}: Props) {
  const usages = useMemo(() => listLeaveUsagesForDoc(doc), [doc])

  if (usages.length === 0) {
    return (
      <section className="no-print mb-4 rounded-2xl border border-dashed border-line bg-white/80 px-4 py-3 text-sm text-muted">
        Sin permisos/vacaciones activos para este servicio en{' '}
        {doc.month}/{doc.year}. El validador o admin los registra en el módulo
        Permisos.
      </section>
    )
  }

  return (
    <section className="no-print mb-4 rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Control de permisos
          </p>
          <h2 className="font-display text-lg text-navy">
            Vacaciones y permisos del mes
          </h2>
          <p className="text-xs text-muted">
            Se compara lo autorizado con lo marcado en la planilla (clave V, P,
            CM…).
          </p>
        </div>
        {onGoHorario ? (
          <button
            type="button"
            onClick={onGoHorario}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-navy hover:bg-sand"
          >
            {goLabel}
          </button>
        ) : null}
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {usages.map((u) => {
          const pct =
            u.authorizedHours > 0
              ? Math.min(100, Math.round((u.usedHours / u.authorizedHours) * 100))
              : 0
          const bad = u.conflictDays.length > 0 || u.overQuota
          return (
            <li
              key={`${u.leave.id}-${u.leave.staffId}`}
              className={`rounded-xl border p-3 ${
                bad
                  ? 'border-rose-300 bg-rose-50'
                  : 'border-line bg-gradient-to-b from-white to-sand/25'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-semibold text-navy">
                  {u.leave.staffName}
                </p>
                <span className="shrink-0 rounded bg-teal/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-teal">
                  {u.leave.absenceCode}
                </span>
              </div>
              <p className="text-[11px] text-muted">
                {LEAVE_KIND_LABEL[u.leave.kind]} · {u.leave.startDate} →{' '}
                {u.leave.endDate}
              </p>
              <p className="mt-2 text-sm text-ink">
                <strong>{u.usedHours}</strong>
                <span className="text-muted"> / {u.authorizedHours} h</span>
                <span className="ml-2 text-[11px] text-muted">
                  resto {u.remainingHours} h
                </span>
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand">
                <div
                  className={`h-full rounded-full ${
                    bad ? 'bg-rose-500' : pct >= 90 ? 'bg-amber-500' : 'bg-teal'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-muted">
                {leaveUsageSummary(u)}
                {u.conflictDays.length
                  ? ` · conflicto día(s) ${u.conflictDays.join(', ')}`
                  : ''}
                {u.unmarkedDays.length
                  ? ` · sin marcar ${u.unmarkedDays.length}`
                  : ''}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
