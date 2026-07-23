import { useEffect, useRef, useState } from 'react'
import type { ServiceType, StaffMember } from '../types'
import {
  createEmptyStaff,
  listStaff,
  removeStaffFromLibrary,
  saveStaffList,
  upsertStaff,
} from '../lib/staffLibrary'
import { downloadStaffTemplate, parseStaffFile } from '../lib/importStaff'

type Props = {
  serviceType: ServiceType
  unitName: string
  onLoadIntoSchedule: (staff: StaffMember[]) => void
  onFlash: (msg: string) => void
}

const SECTIONS_ENF = [
  'Enfermeras/os y Auxiliar de Enfermería',
  'Internos de Enfermería',
  'Auxiliar de Enfermería',
]

export function StaffManager({
  serviceType,
  unitName,
  onLoadIntoSchedule,
  onFlash,
}: Props) {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const isEnf = serviceType === 'enfermeria'

  useEffect(() => {
    setStaff(listStaff(serviceType, unitName))
  }, [serviceType, unitName])

  function refresh() {
    setStaff(listStaff(serviceType, unitName))
  }

  function startNew() {
    setEditing(createEmptyStaff(serviceType, unitName))
  }

  function saveEdit() {
    if (!editing) return
    if (!editing.name.trim()) {
      onFlash('Ingrese nombres y apellidos')
      return
    }
    const toSave = isEnf ? editing : { ...editing, fun: 'MED' }
    upsertStaff(serviceType, unitName, toSave)
    setEditing(null)
    refresh()
    onFlash('Personal guardado en biblioteca del servicio')
  }

  async function handleImport(file: File) {
    try {
      const imported = await parseStaffFile(file, serviceType, unitName)
      if (imported.length === 0) {
        onFlash('No se encontró personal en el archivo')
        return
      }
      const merged = [...listStaff(serviceType, unitName)]
      for (const m of imported) {
        const dup = merged.findIndex(
          (s) => s.name.toLowerCase() === m.name.toLowerCase() && s.fun === m.fun,
        )
        if (dup >= 0) merged[dup] = { ...m, id: merged[dup].id }
        else merged.push(m)
      }
      saveStaffList(serviceType, unitName, merged)
      refresh()
      onFlash(`Importados ${imported.length} registros`)
    } catch {
      onFlash('Error al importar archivo')
    }
  }

  return (
    <section className="no-print mb-4 rounded-2xl border border-line bg-white/85 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-xl text-navy">
            Personal del servicio
          </h2>
          <p className="text-sm text-muted">
            CRUD por servicio · Importar Excel/CSV · Cargar al horario del mes
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadStaffTemplate(serviceType, unitName)}
            className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-sand"
          >
            Descargar plantilla
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-sand"
          >
            Importar Excel/CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleImport(f)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={startNew}
            className="rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white hover:bg-navy-deep"
          >
            + Nuevo
          </button>
          <button
            type="button"
            onClick={() => {
              onLoadIntoSchedule(staff.filter((s) => s.active !== false))
              onFlash('Personal cargado al horario')
            }}
            className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
            disabled={staff.length === 0}
          >
            Cargar al horario
          </button>
        </div>
      </div>

      {editing && (
        <div className="mb-3 grid gap-2 rounded-xl border border-teal/30 bg-teal/5 p-3 sm:grid-cols-3 lg:grid-cols-6">
          <label className="text-xs text-muted">
            FUN
            {isEnf ? (
              <input
                className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-sm"
                value={editing.fun}
                onChange={(e) =>
                  setEditing({ ...editing, fun: e.target.value.toUpperCase() })
                }
              />
            ) : (
              <input
                className="mt-1 w-full rounded-lg border border-line bg-sand/40 px-2 py-1.5 text-sm"
                value="MED"
                readOnly
                title="En horarios médicos la función es siempre MED"
              />
            )}
          </label>
          <label className="text-xs text-muted sm:col-span-2">
            Nombres y apellidos
            <input
              className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-sm"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </label>
          <label className="text-xs text-muted">
            Relación laboral
            <input
              className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-sm"
              value={editing.relacionLaboral}
              onChange={(e) =>
                setEditing({ ...editing, relacionLaboral: e.target.value })
              }
            />
          </label>
          <label className="text-xs text-muted">
            Código
            <input
              className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-sm"
              value={editing.codigoPersonal}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  codigoPersonal: e.target.value.toUpperCase(),
                })
              }
            />
          </label>
          {isEnf && (
            <label className="text-xs text-muted">
              Sección
              <select
                className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-sm"
                value={editing.section}
                onChange={(e) =>
                  setEditing({ ...editing, section: e.target.value })
                }
              >
                {SECTIONS_ENF.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex items-end gap-2 sm:col-span-3 lg:col-span-6">
            <button
              type="button"
              onClick={saveEdit}
              className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-line px-3 py-2 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-navy text-white">
            <tr>
              {isEnf && <th className="px-2 py-2 text-left">FUN</th>}
              <th className="px-2 py-2 text-left">Nombres</th>
              <th className="px-2 py-2 text-left">Relación</th>
              <th className="px-2 py-2 text-left">Código</th>
              {isEnf && <th className="px-2 py-2 text-left">Sección</th>}
              <th className="px-2 py-2 text-center">Activo</th>
              <th className="px-2 py-2">—</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 && (
              <tr>
                <td
                  colSpan={isEnf ? 7 : 5}
                  className="px-3 py-4 text-center text-muted"
                >
                  Sin personal en la biblioteca de este servicio. Importe o
                  agregue.
                </td>
              </tr>
            )}
            {staff.map((s) => (
              <tr key={s.id} className="border-t border-line">
                {isEnf && (
                  <td className="px-2 py-1.5 font-semibold">{s.fun}</td>
                )}
                <td className="px-2 py-1.5">{s.name}</td>
                <td className="px-2 py-1.5 text-muted">{s.relacionLaboral}</td>
                <td className="px-2 py-1.5 font-bold text-navy">
                  {s.codigoPersonal}
                </td>
                {isEnf && (
                  <td className="px-2 py-1.5 text-xs text-muted">{s.section}</td>
                )}
                <td className="px-2 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={s.active !== false}
                    onChange={(e) => {
                      upsertStaff(serviceType, unitName, {
                        ...s,
                        active: e.target.checked,
                      })
                      refresh()
                    }}
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    type="button"
                    className="mr-2 text-xs text-navy underline"
                    onClick={() => setEditing(s)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="text-xs text-red-700"
                    onClick={() => {
                      removeStaffFromLibrary(serviceType, unitName, s.id)
                      refresh()
                    }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
