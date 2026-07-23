import { useMemo } from 'react'
import type { ScheduleDoc } from '../types'
import { LEAVE_KIND_LABEL } from '../lib/leavesStore'
import {
  LEAVE_STATUS_LABEL,
  applyLeaveCodesToEmpty,
  leaveUsageStatus,
  listLeaveUsagesForDoc,
} from '../lib/leaveValidation'

type Props = {
  doc: ScheduleDoc
  onGoHorario?: () => void
  goLabel?: string
  readOnly?: boolean
  onChange?: (doc: ScheduleDoc) => void
  onFlash?: (msg: string) => void
}

/**
 * Panel compacto: balance de vacaciones/permisos vs lo pintado en el mes.
 */
export function LeaveBalancePanel({
  doc,
  onGoHorario,
  goLabel = 'Ir al horario',
  readOnly = false,
  onChange,
  onFlash,
}: Props) {
  const usages = useMemo(() => listLeaveUsagesForDoc(doc), [doc])

  if (usages.length === 0) return null

  const conflicts = usages.filter((u) => leaveUsageStatus(u) === 'conflicto')
    .length
  const over = usages.filter((u) => leaveUsageStatus(u) === 'exceso').length
  const pending = usages.filter((u) => leaveUsageStatus(u) === 'pendiente')
    .length

  return (
    <section className="no-print mb-4 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line bg-gradient-to-r from-sand/50 to-white px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Control de permisos
          </p>
          <h2 className="font-display text-lg text-navy">
            Vacaciones y permisos del mes
          </h2>
          <p className="text-xs text-muted">
            {usages.length} registro(s)
            {conflicts ? ` · ${conflicts} conflicto(s)` : ''}
            {over ? ` · ${over} exceso(s)` : ''}
            {pending ? ` · ${pending} pendiente(s)` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!readOnly && onChange ? (
            <button
              type="button"
              onClick={() => {
                const { doc: next, painted } = applyLeaveCodesToEmpty(doc)
                if (painted === 0) {
                  onFlash?.('No hay días vacíos de permiso por marcar')
                  return
                }
                onChange(next)
                onFlash?.(
                  `Marcados ${painted} día(s) con clave de permiso/vacaciones`,
                )
              }}
              className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
            >
              Aplicar claves a vacíos
            </button>
          ) : null}
          {onGoHorario ? (
            <button
              type="button"
              onClick={onGoHorario}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:bg-sand"
            >
              {goLabel}
            </button>
          ) : null}
        </div>
      </div>

      <ul className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
        {usages.map((u) => {
          const status = leaveUsageStatus(u)
          const pct =
            u.authorizedHours > 0
              ? Math.min(
                  100,
                  Math.round((u.usedHours / u.authorizedHours) * 100),
                )
              : 0
          const bad = status === 'conflicto' || status === 'exceso'
          return (
            <li
              key={`${u.leave.id}-${u.leave.staffId}`}
              className={`rounded-xl border p-3 ${
                bad
                  ? 'border-rose-300 bg-rose-50'
                  : status === 'pendiente'
                    ? 'border-amber-200 bg-amber-50/60'
                    : 'border-line bg-gradient-to-b from-white to-sand/25'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-semibold text-navy">
                  {u.leave.staffName}
                </p>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                    bad
                      ? 'bg-rose-200 text-rose-950'
                      : status === 'pendiente'
                        ? 'bg-amber-200 text-amber-950'
                        : status === 'completo'
                          ? 'bg-teal/20 text-teal'
                          : 'bg-sand text-muted'
                  }`}
                >
                  {LEAVE_STATUS_LABEL[status]}
                </span>
              </div>
              <p className="text-[11px] text-muted">
                {LEAVE_KIND_LABEL[u.leave.kind]} · clave{' '}
                <strong className="text-teal">{u.leave.absenceCode}</strong>
              </p>
              <p className="text-[10px] text-muted">
                {u.leave.startDate} → {u.leave.endDate}
              </p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-xl text-navy">
                  {u.usedHours}
                </span>
                <span className="text-xs text-muted">
                  / {u.authorizedHours} h
                </span>
                <span className="ml-auto text-[10px] tabular-nums text-muted">
                  resto {u.remainingHours} h
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/80 ring-1 ring-line/60">
                <div
                  className={`h-full rounded-full transition-all ${
                    bad ? 'bg-rose-500' : pct >= 90 ? 'bg-amber-500' : 'bg-teal'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] leading-snug text-muted">
                {u.markedDays.length}/{u.daysInMonth.length} día(s) marcados
                {u.conflictDays.length
                  ? ` · conflicto: ${u.conflictDays.join(', ')}`
                  : ''}
                {u.unmarkedDays.length
                  ? ` · sin marcar: ${u.unmarkedDays.slice(0, 4).join(', ')}${u.unmarkedDays.length > 4 ? '…' : ''}`
                  : ''}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
