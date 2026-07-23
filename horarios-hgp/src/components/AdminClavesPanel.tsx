import { useEffect, useState } from 'react'
import type { ServiceType, ShiftCode } from '../types'
import { SERVICE_LABEL } from '../data/templates'
import {
  SHIFT_GROUPS,
  SHIFT_GROUP_LABEL,
  emptyShiftDraft,
  removeShift,
  resetShiftsToDefaults,
  shiftsFor,
  upsertShift,
} from '../lib/shiftsStore'

type Props = {
  onFlash: (msg: string) => void
}

/**
 * CRUD de claves (turnos / áreas / ausencias) por tipo de servicio.
 */
export function AdminClavesPanel({ onFlash }: Props) {
  const [serviceType, setServiceType] = useState<ServiceType>('medico')
  const [list, setList] = useState<ShiftCode[]>(() => shiftsFor('medico'))
  const [form, setForm] = useState<ShiftCode>(emptyShiftDraft)
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  function refresh(t = serviceType) {
    setList(shiftsFor(t))
  }

  useEffect(() => {
    refresh(serviceType)
    setEditingCode(null)
    setForm(emptyShiftDraft())
  }, [serviceType])

  const visible = list.filter((s) => {
    const q = filter.trim().toLowerCase()
    if (!q) return true
    return `${s.code} ${s.label} ${s.group}`.toLowerCase().includes(q)
  })

  function startEdit(s: ShiftCode) {
    setEditingCode(s.code)
    setForm({ ...s })
  }

  function save() {
    try {
      upsertShift(serviceType, form, editingCode ?? undefined)
      refresh()
      setForm(emptyShiftDraft())
      setEditingCode(null)
      onFlash(editingCode ? `Clave ${form.code} actualizada` : `Clave ${form.code} creada`)
    } catch (e) {
      onFlash(e instanceof Error ? e.message : 'No se pudo guardar la clave')
    }
  }

  function remove(code: string) {
    if (!window.confirm(`¿Eliminar la clave ${code}?`)) return
    try {
      removeShift(serviceType, code)
      refresh()
      if (editingCode === code) {
        setEditingCode(null)
        setForm(emptyShiftDraft())
      }
      onFlash(`Clave ${code} eliminada`)
    } catch (e) {
      onFlash(e instanceof Error ? e.message : 'No se pudo eliminar')
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg text-navy">
            {editingCode ? `Editar clave ${editingCode}` : 'Nueva clave'}
          </h2>
          <select
            className="rounded-xl border border-line px-3 py-2 text-sm"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value as ServiceType)}
          >
            <option value="medico">{SERVICE_LABEL.medico}</option>
            <option value="enfermeria">{SERVICE_LABEL.enfermeria}</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-muted">
            Código
            <input
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm uppercase"
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
              }
              placeholder="Ej. CE, D1, L"
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Descripción
            <input
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
              value={form.label}
              onChange={(e) =>
                setForm((f) => ({ ...f, label: e.target.value }))
              }
              placeholder="Consulta externa, Día 12 h…"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-semibold text-muted">
              Horas
              <input
                type="number"
                min={0}
                step={0.5}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                value={form.hours}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    hours: Number(e.target.value),
                  }))
                }
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Grupo
              <select
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                value={form.group}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    group: e.target.value as ShiftCode['group'],
                  }))
                }
              >
                {SHIFT_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {SHIFT_GROUP_LABEL[g]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-xs font-semibold text-muted">
            Horario (opcional)
            <input
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
              value={form.timeRange ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, timeRange: e.target.value }))
              }
              placeholder="07:00–19:30"
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Nota (opcional)
            <input
              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
              value={form.note ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, note: e.target.value }))
              }
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-semibold text-muted">
              Color fondo
              <input
                type="color"
                className="mt-1 h-10 w-full cursor-pointer rounded-xl border border-line bg-white"
                value={form.color || '#d9ebe9'}
                onChange={(e) =>
                  setForm((f) => ({ ...f, color: e.target.value }))
                }
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Color texto
              <input
                type="color"
                className="mt-1 h-10 w-full cursor-pointer rounded-xl border border-line bg-white"
                value={form.text || '#1c3a5c'}
                onChange={(e) =>
                  setForm((f) => ({ ...f, text: e.target.value }))
                }
              />
            </label>
          </div>
          <div
            className="rounded-xl border border-line px-3 py-2 text-center text-sm font-bold"
            style={{
              background: form.color || '#d9ebe9',
              color: form.text || '#1c3a5c',
            }}
          >
            Vista previa: {form.code || '—'} · {form.hours || 0} h
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={save}
              className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white"
            >
              {editingCode ? 'Guardar cambios' : 'Crear clave'}
            </button>
            {editingCode ? (
              <button
                type="button"
                onClick={() => {
                  setEditingCode(null)
                  setForm(emptyShiftDraft())
                }}
                className="rounded-xl border border-line px-3 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg text-navy">
            Claves {SERVICE_LABEL[serviceType]} ({list.length})
          </h2>
          <button
            type="button"
            onClick={() => {
              if (
                !window.confirm(
                  `¿Restablecer claves de ${SERVICE_LABEL[serviceType]}?`,
                )
              )
                return
              resetShiftsToDefaults(serviceType)
              refresh()
              onFlash('Claves restablecidas')
            }}
            className="text-xs font-semibold text-teal underline"
          >
            Restablecer defaults
          </button>
        </div>
        <input
          className="mb-3 w-full rounded-xl border border-line px-3 py-2 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar código o descripción…"
        />
        <ul className="max-h-[32rem] space-y-1.5 overflow-y-auto">
          {visible.map((s) => (
            <li
              key={s.code}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-2.5 py-2"
            >
              <span
                className="inline-flex min-w-[3rem] items-center justify-center rounded-md px-2 py-1 text-xs font-bold"
                style={{ background: s.color, color: s.text || '#1c3a5c' }}
              >
                {s.code}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-navy">
                  {s.label}
                </p>
                <p className="text-[11px] text-muted">
                  {s.hours} h · {SHIFT_GROUP_LABEL[s.group]}
                  {s.timeRange ? ` · ${s.timeRange}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => startEdit(s)}
                className="rounded-lg border border-line px-2 py-1 text-xs font-semibold"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => remove(s.code)}
                className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-900"
              >
                Eliminar
              </button>
            </li>
          ))}
          {visible.length === 0 ? (
            <p className="text-sm text-muted">No hay claves con ese filtro.</p>
          ) : null}
        </ul>
      </div>
    </section>
  )
}
