import type { AppUser, SavedIndexItem, ScheduleStatus } from '../types'
import { MONTHS_ES, STATUS_LABEL } from '../types'
import {
  isJefeRole,
  isRevisorRole,
  isValidadorRole,
  isAdmisionesRole,
} from '../lib/auth'

type Props = {
  user: AppUser | null
  items: SavedIndexItem[]
  currentId?: string
  onOpen: (id: string) => void
}

function byStatus(items: SavedIndexItem[], status: ScheduleStatus) {
  return items.filter((i) => i.status === status)
}

/** Bandeja rápida según el rol: qué falta revisar / validar / corregir. */
export function RoleInbox({ user, items, currentId, onOpen }: Props) {
  if (!user || user.role === 'admin') return null

  let title = ''
  let hint = ''
  let pending: SavedIndexItem[] = []
  let accent = 'border-line bg-white/90'

  if (isAdmisionesRole(user.role) && !isJefeRole(user.role) && user.role === 'admisiones') {
    pending = byStatus(items, 'EN_REVISION').filter((i) => !i.admisionesApproved)
    title = 'Bandeja de Admisiones'
    hint = 'Horarios enviados · dé el visto bueno (junto al revisor)'
    accent = 'border-teal/30 bg-teal/5'
  } else if (isRevisorRole(user.role) && !isJefeRole(user.role)) {
    pending = byStatus(items, 'EN_REVISION').filter((i) => !i.revisorApproved)
    title = 'Bandeja del revisor'
    hint = 'Horarios en revisión · apruebe (junto a Admisiones) o devuelva'
    accent = 'border-violet-200 bg-violet-50/70'
  } else if (isValidadorRole(user.role) && !isJefeRole(user.role)) {
    pending = byStatus(items, 'APROBADO')
    title = 'Bandeja del validador'
    hint = 'Horarios aprobados por Admisiones y Revisor · validación formal'
    accent = 'border-emerald-200 bg-emerald-50/70'
  } else if (isJefeRole(user.role)) {
    const drafts = byStatus(items, 'BORRADOR')
    pending = drafts
    title = 'Bandeja del jefe'
    hint = 'Borradores por completar o corregir y enviar a revisión'
    accent = 'border-teal/30 bg-teal/5'
  } else {
    return null
  }

  return (
    <section className={`no-print mb-4 rounded-2xl border p-4 shadow-sm ${accent}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg text-navy">{title}</h2>
          <p className="text-sm text-muted">{hint}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-bold ${
            pending.length
              ? 'bg-navy text-white'
              : 'bg-white text-muted ring-1 ring-line'
          }`}
        >
          {pending.length} pendiente{pending.length === 1 ? '' : 's'}
        </span>
      </div>

      {pending.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line/80 bg-white/60 px-3 py-4 text-center text-sm text-muted">
          No hay pendientes en este momento.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {pending.slice(0, 8).map((s) => {
            const active = s.id === currentId
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onOpen(s.id)}
                  className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                    active
                      ? 'border-navy bg-navy text-white'
                      : 'border-line bg-white hover:border-teal/40 hover:bg-sand/40'
                  }`}
                >
                  <span className="font-semibold">
                    {s.unitName} · {MONTHS_ES[s.month - 1]} {s.year}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      active ? 'text-white/80' : 'text-muted'
                    }`}
                  >
                    {s.status ? STATUS_LABEL[s.status] : '—'}
                    {active ? ' · abierto' : ' · Abrir'}
                  </span>
                </button>
              </li>
            )
          })}
          {pending.length > 8 && (
            <li className="text-center text-xs text-muted">
              +{pending.length - 8} más en la lista de abajo
            </li>
          )}
        </ul>
      )}
    </section>
  )
}

export function countPendingForRole(
  user: AppUser | null,
  items: SavedIndexItem[],
): number {
  if (!user || user.role === 'admin') return 0
  if (user.role === 'admisiones') {
    return byStatus(items, 'EN_REVISION').filter((i) => !i.admisionesApproved)
      .length
  }
  if (isRevisorRole(user.role) && !isJefeRole(user.role)) {
    return byStatus(items, 'EN_REVISION').filter((i) => !i.revisorApproved)
      .length
  }
  if (isValidadorRole(user.role) && !isJefeRole(user.role)) {
    return byStatus(items, 'APROBADO').length
  }
  if (isJefeRole(user.role)) {
    return byStatus(items, 'BORRADOR').length
  }
  return 0
}
