import type { ScheduleDoc } from '../types'
import { runAllValidations } from '../lib/validation'

type Props = {
  doc: ScheduleDoc
  onGoContingency?: () => void
  onGoDistribution?: () => void
}

/** Resumen de validaciones visible mientras se elabora el horario. */
export function AlertsBanner({
  doc,
  onGoContingency,
  onGoDistribution,
}: Props) {
  const alerts = runAllValidations(doc)
  if (alerts.length === 0) {
    return (
      <section className="no-print mb-4 rounded-2xl border border-teal/30 bg-teal/5 px-4 py-3 text-sm text-navy">
        Validaciones OK · cobertura, descansos, permisos y contingencia sin
        alertas críticas.
      </section>
    )
  }

  const errors = alerts.filter((a) => a.level === 'error')
  const warnings = alerts.filter((a) => a.level === 'warning')
  const shown = alerts.slice(0, 8)

  return (
    <section
      className={`no-print mb-4 rounded-2xl border px-4 py-3 shadow-sm ${
        errors.length
          ? 'border-red-300 bg-red-50'
          : 'border-amber-300 bg-amber-50'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-navy">
            Alertas del mes · {errors.length} error(es) · {warnings.length}{' '}
            aviso(s)
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-ink">
            {shown.map((a, i) => (
              <li key={`${a.code}-${a.day ?? 0}-${a.staffId ?? i}`}>
                <span
                  className={
                    a.level === 'error'
                      ? 'font-semibold text-red-700'
                      : 'text-amber-900'
                  }
                >
                  {a.level === 'error' ? '●' : '○'} {a.message}
                </span>
              </li>
            ))}
            {alerts.length > shown.length && (
              <li className="text-muted">
                …y {alerts.length - shown.length} más en DISTRIBUCIÓN /
                aprobación
              </li>
            )}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          {onGoDistribution && (
            <button
              type="button"
              onClick={onGoDistribution}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm hover:bg-sand"
            >
              Ver distribución
            </button>
          )}
          {onGoContingency &&
            alerts.some((a) => a.code === 'contingencia_requerida') && (
              <button
                type="button"
                onClick={onGoContingency}
                className="rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white"
              >
                Completar contingencia
              </button>
            )}
        </div>
      </div>
    </section>
  )
}
