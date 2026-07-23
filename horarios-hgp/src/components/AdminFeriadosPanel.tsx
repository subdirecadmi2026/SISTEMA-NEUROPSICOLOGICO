import { useMemo, useState } from 'react'
import type { Holiday } from '../lib/holidays'
import {
  clearCustomHolidays,
  deleteHoliday,
  holidaysForYear,
  restoreNationalHolidays,
  updateHoliday,
} from '../lib/holidays'

type Props = {
  year: number
  onYear: (y: number) => void
  onFlash: (msg: string) => void
}

/**
 * CRUD de feriados para el administrador: crear, editar y eliminar.
 */
export function AdminFeriadosPanel({ year, onYear, onFlash }: Props) {
  const [tick, setTick] = useState(0)
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [filter, setFilter] = useState('')

  const list = useMemo(() => {
    void tick
    return holidaysForYear(year)
  }, [year, tick])

  const visible = list.filter((h) => {
    const q = filter.trim().toLowerCase()
    if (!q) return true
    return `${h.date} ${h.name}`.toLowerCase().includes(q)
  })

  function refresh() {
    setTick((n) => n + 1)
  }

  function resetForm() {
    setEditingDate(null)
    setDate('')
    setName('')
  }

  function startCreate() {
    resetForm()
    setDate(`${year}-01-01`)
  }

  function startEdit(h: Holiday) {
    setEditingDate(h.date)
    setDate(h.date)
    setName(h.name)
  }

  function save() {
    try {
      updateHoliday(editingDate, { date, name, editable: true })
      onFlash(editingDate ? 'Feriado actualizado' : 'Feriado creado')
      resetForm()
      refresh()
    } catch (e) {
      onFlash(e instanceof Error ? e.message : 'No se pudo guardar')
    }
  }

  function remove(h: Holiday) {
    const tip =
      h.source === 'nacional'
        ? `¿Ocultar el feriado nacional «${h.name}» (${h.date})?`
        : `¿Eliminar el feriado «${h.name}» (${h.date})?`
    if (!window.confirm(tip)) return
    deleteHoliday(h.date)
    if (editingDate === h.date) resetForm()
    refresh()
    onFlash(
      h.source === 'nacional'
        ? 'Feriado nacional ocultado'
        : 'Feriado eliminado',
    )
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg text-navy">
            {editingDate ? 'Editar feriado' : 'Nuevo feriado'}
          </h2>
          <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-muted">
            Año
            <input
              type="number"
              className="w-24 rounded-xl border border-line px-2 py-1.5 text-sm text-ink"
              value={year}
              onChange={(e) => onYear(Number(e.target.value) || year)}
            />
          </label>
        </div>
        <p className="mb-3 text-xs text-muted">
          Puede crear feriados institucionales, editar el nombre/fecha de
          cualquiera (incluido nacional) o eliminarlo.
        </p>
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-muted">
            Fecha
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Nombre
            <input
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Aniversario HGP"
            />
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={save}
              className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white"
            >
              {editingDate ? 'Guardar cambios' : 'Crear feriado'}
            </button>
            {editingDate ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-line px-3 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
            ) : (
              <button
                type="button"
                onClick={startCreate}
                className="rounded-xl border border-line px-3 py-2 text-sm font-semibold"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg text-navy">
            Feriados {year} ({list.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                restoreNationalHolidays(year)
                refresh()
                onFlash('Feriados nacionales restaurados')
              }}
              className="text-xs font-semibold text-teal underline"
            >
              Restaurar nacionales
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  !window.confirm(
                    `¿Eliminar todos los feriados custom de ${year}?`,
                  )
                )
                  return
                clearCustomHolidays(year)
                refresh()
                onFlash('Custom del año eliminados')
              }}
              className="text-xs font-semibold text-rose-800 underline"
            >
              Limpiar custom
            </button>
          </div>
        </div>
        <input
          className="mb-3 w-full rounded-xl border border-line px-3 py-2 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar por fecha o nombre…"
        />
        <ul className="max-h-[32rem] space-y-1.5 overflow-y-auto">
          {visible.map((h) => (
            <li
              key={h.date}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-navy">
                  {h.date} · {h.name}
                </p>
                <p className="text-[11px] text-muted">
                  {h.source === 'custom'
                    ? 'Creado / editado por admin'
                    : 'Nacional Ecuador'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => startEdit(h)}
                className="rounded-lg border border-line px-2 py-1 text-xs font-semibold"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => remove(h)}
                className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-900"
              >
                Eliminar
              </button>
            </li>
          ))}
          {visible.length === 0 ? (
            <p className="text-sm text-muted">No hay feriados con ese filtro.</p>
          ) : null}
        </ul>
      </div>
    </section>
  )
}
