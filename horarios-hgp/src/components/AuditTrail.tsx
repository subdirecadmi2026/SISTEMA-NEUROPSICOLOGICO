import type { ScheduleDoc } from '../types'

type Props = {
  doc: ScheduleDoc
}

/** Historial reciente de acciones del horario. */
export function AuditTrail({ doc }: Props) {
  const entries = [...doc.audit].slice(-12).reverse()
  if (entries.length === 0) {
    return (
      <section className="no-print mb-4 rounded-2xl border border-dashed border-line bg-white/70 px-4 py-3 text-sm text-muted">
        Sin historial aún. Las acciones del mes aparecerán aquí.
      </section>
    )
  }

  return (
    <section className="no-print mb-4 rounded-2xl border border-line bg-white/90 p-4 shadow-sm">
      <h2 className="font-display text-lg text-navy">Historial</h2>
      <p className="mb-2 text-xs text-muted">
        Últimas {entries.length} acciones de este horario.
      </p>
      <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
        {entries.map((e) => (
          <li
            key={e.id}
            className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/70 py-1.5 last:border-0"
          >
            <span>
              <strong className="text-navy">{e.action}</strong>
              {e.detail ? (
                <span className="text-muted"> — {e.detail}</span>
              ) : null}
            </span>
            <span className="text-[11px] text-muted">
              {e.userName} · {new Date(e.at).toLocaleString('es-EC')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
