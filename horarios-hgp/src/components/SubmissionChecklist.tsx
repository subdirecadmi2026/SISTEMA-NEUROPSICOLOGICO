import type { ScheduleDoc } from '../types'
import {
  getSubmissionChecklist,
  isReadyToSubmit,
} from '../lib/validation'

type Props = {
  doc: ScheduleDoc
  onGoFix?: (hint: 'personal' | 'horario' | 'contingencia' | 'distribucion') => void
}

/** Lista de requisitos antes de enviar a revisión. */
export function SubmissionChecklist({ doc, onGoFix }: Props) {
  const items = getSubmissionChecklist(doc)
  const ready = isReadyToSubmit(doc)
  const requiredFail = items.filter((i) => i.level === 'required' && !i.ok)

  return (
    <section
      className={`no-print mb-4 rounded-2xl border p-4 shadow-sm ${
        ready
          ? 'border-teal/40 bg-teal/5'
          : 'border-amber-300 bg-amber-50/70'
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg text-navy">
          Listo para enviar
        </h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
            ready
              ? 'bg-teal text-white'
              : 'bg-amber-200 text-amber-950'
          }`}
        >
          {ready ? 'Cumple requisitos' : `${requiredFail.length} pendiente(s)`}
        </span>
      </div>
      <ul className="space-y-1.5 text-sm">
        {items.map((i) => (
          <li key={i.id} className="flex items-start gap-2">
            <span
              className={
                i.ok ? 'font-bold text-teal' : 'font-bold text-amber-800'
              }
            >
              {i.ok ? '✓' : '○'}
            </span>
            <span className={i.ok ? 'text-ink' : 'text-amber-950'}>
              {i.message}
              {!i.ok && i.level === 'required' && (
                <span className="ml-1 text-[10px] uppercase text-red-700">
                  obligatorio
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {!ready && onGoFix && (
        <div className="mt-3 flex flex-wrap gap-2">
          {requiredFail.some((i) => i.id === 'nombres') && (
            <button
              type="button"
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold"
              onClick={() => onGoFix('personal')}
            >
              Ir a personal
            </button>
          )}
          {requiredFail.some((i) =>
            ['pintado', 'vacios', 'jefe', 'avisos'].includes(i.id),
          ) && (
            <button
              type="button"
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold"
              onClick={() => onGoFix('horario')}
            >
              Ir a horario
            </button>
          )}
          {requiredFail.some((i) => i.id === 'avisos') && (
            <button
              type="button"
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold"
              onClick={() => onGoFix('contingencia')}
            >
              Ver contingencia
            </button>
          )}
        </div>
      )}
    </section>
  )
}
