import type { ServiceType, ShiftCode } from '../types'
import { SERVICE_LABEL, shiftsFor, shiftMeta } from '../data/templates'

type Props = {
  serviceType: ServiceType
  activeCode: string
  claveTab: 'turno' | 'area' | 'ausencia' | 'todas'
  paintMode: boolean
  showTable: boolean
  recentCodes?: string[]
  onActiveCode: (code: string) => void
  onClaveTab: (t: 'turno' | 'area' | 'ausencia' | 'todas') => void
  onPaintMode: (v: boolean) => void
  onGoHorario?: () => void
}

/** Paleta de claves: un solo módulo estético para seleccionar y pintar. */
export function ShiftPalette({
  serviceType,
  activeCode,
  claveTab,
  paintMode,
  showTable,
  recentCodes = [],
  onActiveCode,
  onClaveTab,
  onPaintMode,
  onGoHorario,
}: Props) {
  const shifts = shiftsFor(serviceType)
  const visible: ShiftCode[] =
    claveTab === 'todas' ? shifts : shifts.filter((s) => s.group === claveTab)
  const isEnf = serviceType === 'enfermeria'
  const recent = recentCodes
    .map((c) => shiftMeta(serviceType, c))
    .filter((s): s is ShiftCode => !!s)
  const activeMeta = shiftMeta(serviceType, activeCode)

  const filters = (
    [
      ['todas', 'Todas'],
      ['turno', 'Turnos'],
      ...(isEnf ? [] : ([['area', 'Áreas']] as const)),
      ['ausencia', 'Ausencias'],
    ] as const
  )

  return (
    <section className="no-print mb-4 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line bg-gradient-to-r from-navy/[0.04] to-teal/[0.06] px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Pintura
          </p>
          <h2 className="font-display text-lg text-navy">
            Claves — {SERVICE_LABEL[serviceType]}
          </h2>
          <p className="text-xs text-muted">
            {isEnf
              ? 'Elija clave y pinte · Atajos L F V · D1 N1 · M T'
              : 'Elija clave y pinte · Atajos L F V · CE X · PT1 PT2'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeMeta && (
            <span
              className="rounded-xl px-3 py-1.5 text-sm font-bold shadow-sm"
              style={{
                background: activeMeta.color,
                color: activeMeta.text,
              }}
            >
              Activa: {activeMeta.code}
            </span>
          )}
          {!showTable && (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 py-1.5 text-sm font-semibold text-navy">
              <input
                type="checkbox"
                checked={paintMode}
                onChange={(e) => onPaintMode(e.target.checked)}
                className="accent-teal"
              />
              Pintar
            </label>
          )}
        </div>
      </div>

      <div className="px-4 pt-3">
        <div className="inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-sand/70 p-1">
          {filters.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onClaveTab(id)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                claveTab === id
                  ? 'bg-navy text-white shadow-sm'
                  : 'text-muted hover:bg-white hover:text-navy'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {recent.length > 0 && !showTable && (
        <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Recientes
          </span>
          {recent.map((s) => (
            <button
              key={`r-${s.code}`}
              type="button"
              onClick={() => {
                onActiveCode(s.code)
                onGoHorario?.()
              }}
              className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                activeCode === s.code ? 'ring-2 ring-navy ring-offset-1' : ''
              }`}
              style={{ background: s.color, color: s.text }}
            >
              {s.code}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 px-4 py-4">
        {visible.map((s) => {
          const active = activeCode === s.code
          return (
            <button
              key={s.code}
              type="button"
              onClick={() => {
                onActiveCode(s.code)
                onGoHorario?.()
              }}
              title={`${s.label}${s.timeRange ? ` · ${s.timeRange}` : ''}${s.note ? ` · ${s.note}` : ''}`}
              className={`rounded-xl border px-3 py-2 text-left shadow-sm transition hover:brightness-105 ${
                active ? 'ring-2 ring-navy ring-offset-1' : ''
              }`}
              style={{
                background: s.color,
                color: s.text,
                borderColor: active ? '#1c3a5c' : 'transparent',
              }}
            >
              <span className="block text-sm font-bold leading-none">
                {s.code}
              </span>
              <span className="mt-0.5 block max-w-[130px] truncate text-[11px] opacity-85">
                {s.timeRange ?? s.label}
              </span>
            </button>
          )
        })}
      </div>

      {showTable && (
        <div className="border-t border-line px-4 pb-4">
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-navy text-white">
                <tr>
                  <th className="px-3 py-2 text-left">Clave</th>
                  <th className="px-3 py-2 text-left">Descripción</th>
                  <th className="px-3 py-2 text-left">Horario</th>
                  <th className="px-3 py-2 text-left">Nota</th>
                  <th className="px-3 py-2 text-right">Horas</th>
                  <th className="px-3 py-2 text-left">Grupo</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr
                    key={s.code}
                    className="border-t border-line hover:bg-sand/40"
                  >
                    <td className="px-3 py-2">
                      <span
                        className="inline-block rounded-lg px-2 py-0.5 font-bold"
                        style={{ background: s.color, color: s.text }}
                      >
                        {s.code}
                      </span>
                    </td>
                    <td className="px-3 py-2">{s.label}</td>
                    <td className="px-3 py-2 text-muted">
                      {s.timeRange ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-muted">{s.note ?? '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {s.hours}
                    </td>
                    <td className="px-3 py-2 capitalize text-muted">
                      {s.group}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
