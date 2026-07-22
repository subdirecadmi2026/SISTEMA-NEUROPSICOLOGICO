import type { ServiceType, ShiftCode } from '../types'
import { SERVICE_LABEL, shiftsFor } from '../data/templates'

type Props = {
  serviceType: ServiceType
  activeCode: string
  claveTab: 'turno' | 'area' | 'ausencia' | 'todas'
  paintMode: boolean
  showTable: boolean
  onActiveCode: (code: string) => void
  onClaveTab: (t: 'turno' | 'area' | 'ausencia' | 'todas') => void
  onPaintMode: (v: boolean) => void
  onGoHorario?: () => void
}

export function ShiftPalette({
  serviceType,
  activeCode,
  claveTab,
  paintMode,
  showTable,
  onActiveCode,
  onClaveTab,
  onPaintMode,
  onGoHorario,
}: Props) {
  const shifts = shiftsFor(serviceType)
  const visible: ShiftCode[] =
    claveTab === 'todas' ? shifts : shifts.filter((s) => s.group === claveTab)
  const isEnf = serviceType === 'enfermeria'

  return (
    <section className="no-print mb-4 rounded-2xl rounded-tl-none border border-line bg-white/85 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-xl text-navy">
            Claves — {SERVICE_LABEL[serviceType]}
          </h2>
          <p className="text-sm text-muted">
            Seleccione una clave y pinte las celdas. Clic derecho borra.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['todas', 'Todas'],
              ['turno', 'Turnos'],
              ...(isEnf ? [] : ([['area', 'Áreas']] as const)),
              ['ausencia', 'Ausencias'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onClaveTab(id)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                claveTab === id
                  ? 'border-navy bg-navy text-white'
                  : 'border-line bg-sand/60 text-muted'
              }`}
            >
              {label}
            </button>
          ))}
          {!showTable && (
            <label className="ml-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={paintMode}
                onChange={(e) => onPaintMode(e.target.checked)}
              />
              Pintar
            </label>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
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
              className={`rounded-lg border px-3 py-2 text-left transition ${
                active ? 'ring-2 ring-navy ring-offset-1' : ''
              }`}
              style={{
                background: s.color,
                color: s.text,
                borderColor: active ? '#1c3a5c' : '#cfd8e0',
              }}
            >
              <span className="block text-sm font-bold leading-none">
                {s.code}
              </span>
              <span className="block max-w-[140px] truncate text-[11px] opacity-85">
                {s.timeRange ?? s.label}
              </span>
            </button>
          )
        })}
      </div>

      {showTable && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
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
                <tr key={s.code} className="border-t border-line">
                  <td className="px-3 py-2">
                    <span
                      className="inline-block rounded px-2 py-0.5 font-bold"
                      style={{ background: s.color, color: s.text }}
                    >
                      {s.code}
                    </span>
                  </td>
                  <td className="px-3 py-2">{s.label}</td>
                  <td className="px-3 py-2 text-muted">{s.timeRange ?? '—'}</td>
                  <td className="px-3 py-2 text-muted">{s.note ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {s.hours}
                  </td>
                  <td className="px-3 py-2 capitalize text-muted">{s.group}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
