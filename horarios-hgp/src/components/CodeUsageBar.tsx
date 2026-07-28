import type { ScheduleDoc } from '../types'
import { shiftMeta } from '../data/templates'
import { countCodesUsed } from '../lib/scheduleOps'

type Props = {
  doc: ScheduleDoc
  onPickCode?: (code: string) => void
}

/** Resumen de cuántas veces se usó cada clave en el mes. */
export function CodeUsageBar({ doc, onPickCode }: Props) {
  const usage = countCodesUsed(doc)
  if (usage.length === 0) {
    return (
      <section className="no-print mb-4 rounded-2xl border border-dashed border-line bg-white/70 px-4 py-3 text-sm text-muted">
        Aún no hay claves pintadas este mes.
      </section>
    )
  }

  return (
    <section className="no-print mb-4 rounded-2xl border border-line bg-white/90 p-4 shadow-sm">
      <h2 className="font-display text-lg text-navy">Uso de claves del mes</h2>
      <p className="mb-2 text-xs text-muted">
        Clic en una clave para seleccionarla y seguir pintando.
      </p>
      <div className="flex flex-wrap gap-2">
        {usage.map(({ code, count }) => {
          const meta = shiftMeta(doc.serviceType, code)
          return (
            <button
              key={code}
              type="button"
              onClick={() => onPickCode?.(code)}
              className="inline-flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm hover:ring-2 hover:ring-navy/30"
              style={
                meta
                  ? { background: meta.color, color: meta.text }
                  : undefined
              }
              title={meta?.label ?? code}
            >
              <span className="font-bold">{code}</span>
              <span className="rounded bg-black/10 px-1.5 text-xs font-semibold">
                ×{count}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
