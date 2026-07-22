import type { SavedIndexItem } from '../types'
import { MONTHS_ES, STATUS_LABEL } from '../types'

type Props = {
  items: SavedIndexItem[]
  remote: boolean
  loading?: boolean
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onCreate: () => void
  onRefresh: () => void
}

export function SchedulesHome({
  items,
  remote,
  loading,
  onOpen,
  onDelete,
  onCreate,
  onRefresh,
}: Props) {
  return (
    <section className="no-print mb-4 rounded-2xl border border-line bg-white/90 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-xl text-navy">Mis horarios</h2>
          <p className="text-sm text-muted">
            {remote
              ? 'Guardados en servidor (Supabase) y en este navegador'
              : 'Guardados en este navegador'}
            {loading ? ' · actualizando…' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-sand"
          >
            Actualizar lista
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            + Crear horario
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-sand/40 px-4 py-8 text-center">
          <p className="mb-3 text-sm text-muted">
            Aún no hay horarios. Cree uno, elija la especialidad y escriba los
            nombres de los médicos.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white"
          >
            Crear primer horario
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-navy text-white">
              <tr>
                <th className="px-3 py-2 text-left">Servicio</th>
                <th className="px-3 py-2 text-left">Período</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Actualizado</th>
                <th className="px-3 py-2">—</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t border-line hover:bg-sand/30">
                  <td className="px-3 py-2 font-semibold text-navy">
                    {s.unitName}
                  </td>
                  <td className="px-3 py-2">
                    {MONTHS_ES[s.month - 1]} {s.year}
                  </td>
                  <td className="px-3 py-2 capitalize">
                    {s.serviceType === 'enfermeria' ? 'Enfermería' : 'Médico'}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        s.status === 'APROBADO'
                          ? 'bg-teal/15 text-teal'
                          : s.status === 'EN_REVISION'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-sand text-muted'
                      }`}
                    >
                      {s.status ? STATUS_LABEL[s.status] : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {new Date(s.updatedAt).toLocaleString('es-EC')}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      className="mr-2 text-sm font-semibold text-navy underline"
                      onClick={() => onOpen(s.id)}
                    >
                      Abrir
                    </button>
                    <button
                      type="button"
                      className="text-sm text-red-700"
                      onClick={() => onDelete(s.id)}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
