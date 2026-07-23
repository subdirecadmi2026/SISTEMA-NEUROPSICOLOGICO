import type { ScheduleDoc, AppUser } from '../types'
import { roleLabel, resolveReviewComments } from '../lib/auth'

type Props = {
  doc: ScheduleDoc
  user: AppUser | null
  canResolve?: boolean
  onChange: (doc: ScheduleDoc) => void
  onFlash: (msg: string) => void
}

/** Aviso prominente cuando el revisor devolvió el horario con correcciones. */
export function CorrectionsAlert({
  doc,
  user,
  canResolve = true,
  onChange,
  onFlash,
}: Props) {
  const open = (doc.reviewComments ?? []).filter((c) => !c.resolved)
  if (open.length === 0) return null

  const latest = open[open.length - 1]

  return (
    <section className="no-print mb-4 rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
            Devuelto por el revisor
          </p>
          <h2 className="font-display text-xl text-rose-950">
            Corrija y vuelva a enviar
          </h2>
        </div>
        {canResolve && (
          <button
            type="button"
            onClick={() => {
              onChange(resolveReviewComments(doc, user))
              onFlash('Correcciones marcadas como atendidas')
            }}
            className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-900"
          >
            Marcar atendidas
          </button>
        )}
      </div>
      <blockquote className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-ink">
        “{latest.message}”
        <footer className="mt-2 text-[11px] text-muted">
          {latest.userName} · {roleLabel(latest.role)} ·{' '}
          {new Date(latest.at).toLocaleString('es-EC')}
        </footer>
      </blockquote>
      {open.length > 1 && (
        <ul className="mt-2 space-y-1 text-xs text-rose-900">
          {open.slice(0, -1).map((c) => (
            <li key={c.id}>
              · {c.userName}: {c.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
