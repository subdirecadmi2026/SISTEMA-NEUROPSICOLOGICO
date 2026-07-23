import { useEffect, useMemo, useState } from 'react'
import type { SavedIndexItem, ScheduleStatus, ServiceType } from '../types'
import { MONTHS_ES, STATUS_LABEL } from '../types'

type Props = {
  items: SavedIndexItem[]
  remote: boolean
  loading?: boolean
  canCreate?: boolean
  canDelete?: boolean
  defaultStatus?: 'all' | ScheduleStatus
  title?: string
  onOpen: (id: string) => void
  onDelete: (id: string) => void | Promise<void>
  onCreate: () => void
  onRefresh: () => void
}

export function SchedulesHome({
  items,
  remote,
  loading,
  canCreate = true,
  canDelete = true,
  defaultStatus = 'all',
  title = 'Mis horarios',
  onOpen,
  onDelete,
  onCreate,
  onRefresh,
}: Props) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | ScheduleStatus>(defaultStatus)
  const [tipo, setTipo] = useState<'all' | ServiceType>('all')

  useEffect(() => {
    setStatus(defaultStatus)
  }, [defaultStatus])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return items.filter((s) => {
      if (status !== 'all' && s.status !== status) return false
      if (tipo !== 'all' && s.serviceType !== tipo) return false
      if (!needle) return true
      const hay = `${s.unitName} ${MONTHS_ES[s.month - 1]} ${s.year} ${s.serviceType} ${s.status ?? ''}`.toLowerCase()
      return hay.includes(needle)
    })
  }, [items, q, status, tipo])

  return (
    <section className="no-print mb-4 rounded-2xl border border-line bg-white/90 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-xl text-navy">{title}</h2>
          <p className="text-sm text-muted">
            {remote
              ? 'Guardados en servidor (Supabase) y en este navegador'
              : 'Guardados en este navegador'}
            {loading ? ' · actualizando…' : ''}
            {items.length > 0
              ? ` · ${filtered.length}/${items.length}`
              : ''}
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
          {canCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              + Crear horario
            </button>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar servicio o mes…"
            className="min-w-[180px] flex-1 rounded-lg border border-line px-3 py-2 text-sm"
          />
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as 'all' | ServiceType)}
            className="rounded-lg border border-line px-2 py-2 text-sm"
          >
            <option value="all">Todos los tipos</option>
            <option value="medico">Médico</option>
            <option value="enfermeria">Enfermería</option>
          </select>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as 'all' | ScheduleStatus)
            }
            className="rounded-lg border border-line px-2 py-2 text-sm"
          >
            <option value="all">Todos los estados</option>
            <option value="BORRADOR">Borrador</option>
            <option value="EN_REVISION">En revisión</option>
            <option value="APROBADO">Aprobado</option>
            <option value="ARCHIVADO">Validado</option>
          </select>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-sand/40 px-4 py-8 text-center">
          <p className="mb-3 text-sm text-muted">
            {canCreate
              ? 'Aún no hay horarios. Cree uno, elija la especialidad y escriba los nombres.'
              : 'Aún no hay horarios en la lista. Espere a que el jefe envíe uno.'}
          </p>
          {canCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white"
            >
              Crear primer horario
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-sand/30 px-4 py-6 text-center text-sm text-muted">
          Ningún horario coincide con el filtro.
        </p>
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
              {filtered.map((s) => (
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
                    {canDelete && (
                      <button
                        type="button"
                        className="text-sm text-red-700"
                        onClick={() => onDelete(s.id)}
                      >
                        ×
                      </button>
                    )}
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
