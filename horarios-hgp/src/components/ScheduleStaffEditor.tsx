import type { ScheduleDoc, StaffMember } from '../types'
import { createEmptyStaff } from '../lib/staffLibrary'
import { uid } from '../types'

type Props = {
  doc: ScheduleDoc
  readOnly: boolean
  onChange: (doc: ScheduleDoc) => void
  onFlash: (msg: string) => void
}

const SECTIONS_ENF = [
  'Enfermeras/os y Auxiliar de Enfermería',
  'Internos de Enfermería',
  'Auxiliar de Enfermería',
]

export function ScheduleStaffEditor({
  doc,
  readOnly,
  onChange,
  onFlash,
}: Props) {
  const isEnf = doc.serviceType === 'enfermeria'
  const named = doc.staff.filter((s) => s.name.trim()).length

  function update(id: string, patch: Partial<StaffMember>) {
    onChange({
      ...doc,
      staff: doc.staff.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })
  }

  function remove(id: string) {
    const cells = { ...doc.cells }
    Object.keys(cells).forEach((k) => {
      if (k.startsWith(`${id}:`)) delete cells[k]
    })
    onChange({
      ...doc,
      staff: doc.staff
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, order: i + 1 })),
      cells,
    })
  }

  function addOne() {
    const member = {
      ...createEmptyStaff(doc.serviceType, doc.unitName),
      id: uid(isEnf ? 'enf' : 'med'),
      name: '',
      order: doc.staff.length + 1,
    }
    onChange({ ...doc, staff: [...doc.staff, member] })
  }

  function addMany(n: number) {
    const extras = Array.from({ length: n }, (_, i) => ({
      ...createEmptyStaff(doc.serviceType, doc.unitName),
      id: uid(isEnf ? 'enf' : 'med'),
      name: '',
      order: doc.staff.length + i + 1,
    }))
    onChange({ ...doc, staff: [...doc.staff, ...extras] })
    onFlash(`Agregadas ${n} plazas al horario`)
  }

  return (
    <section className="no-print mb-4 rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-xl text-navy">
            Personal de este horario
          </h2>
          <p className="text-sm text-muted">
            Servicio <strong>{doc.unitName}</strong> · Debe constar mínimo 1
            especialista; puede haber más de 10. Ahora: {named}/{doc.staff.length}{' '}
            con nombre.
          </p>
        </div>
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addOne}
              className="rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white"
            >
              + Agregar 1
            </button>
            <button
              type="button"
              onClick={() => addMany(5)}
              className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-sand"
            >
              + Agregar 5
            </button>
            <button
              type="button"
              onClick={() => addMany(10)}
              className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-sand"
            >
              + Agregar 10
            </button>
          </div>
        )}
      </div>

      {doc.staff.length === 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No hay personal. Use «Crear horario» o agregue plazas aquí (mínimo 1).
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-navy text-white">
            <tr>
              <th className="px-2 py-2 text-left">N°</th>
              <th className="px-2 py-2 text-left">FUN</th>
              <th className="px-2 py-2 text-left">Nombres y apellidos *</th>
              <th className="px-2 py-2 text-left">Relación laboral</th>
              <th className="px-2 py-2 text-left">Código</th>
              <th className="px-2 py-2 text-left">Sección</th>
              {!readOnly && <th className="px-2 py-2">—</th>}
            </tr>
          </thead>
          <tbody>
            {[...doc.staff]
              .sort((a, b) => a.order - b.order)
              .map((s, idx) => (
                <tr
                  key={s.id}
                  className={`border-t border-line ${
                    !s.name.trim() ? 'bg-amber-50/60' : ''
                  }`}
                >
                  <td className="px-2 py-1.5 text-muted">{idx + 1}</td>
                  <td className="px-1 py-1">
                    <input
                      disabled={readOnly}
                      className="w-14 rounded border border-transparent px-1 py-1 font-semibold outline-none focus:border-line focus:bg-white disabled:opacity-70"
                      value={s.fun}
                      onChange={(e) =>
                        update(s.id, { fun: e.target.value.toUpperCase() })
                      }
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      disabled={readOnly}
                      className="w-full min-w-[180px] rounded border border-transparent px-2 py-1 font-medium outline-none focus:border-line focus:bg-white disabled:opacity-70"
                      value={s.name}
                      placeholder="Obligatorio: nombres y apellidos"
                      onChange={(e) => update(s.id, { name: e.target.value })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      disabled={readOnly}
                      className="w-full rounded border border-transparent px-2 py-1 outline-none focus:border-line focus:bg-white disabled:opacity-70"
                      value={s.relacionLaboral}
                      onChange={(e) =>
                        update(s.id, { relacionLaboral: e.target.value })
                      }
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      disabled={readOnly}
                      className="w-16 rounded border border-transparent px-1 py-1 text-center font-bold text-navy outline-none focus:border-line focus:bg-white disabled:opacity-70"
                      value={s.codigoPersonal}
                      onChange={(e) =>
                        update(s.id, {
                          codigoPersonal: e.target.value.toUpperCase(),
                        })
                      }
                    />
                  </td>
                  <td className="px-1 py-1">
                    {isEnf ? (
                      <select
                        disabled={readOnly}
                        className="w-full max-w-[220px] rounded border border-transparent px-1 py-1 text-xs outline-none focus:border-line disabled:opacity-70"
                        value={s.section}
                        onChange={(e) =>
                          update(s.id, { section: e.target.value })
                        }
                      >
                        {SECTIONS_ENF.map((sec) => (
                          <option key={sec} value={sec}>
                            {sec}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        disabled={readOnly}
                        className="w-full rounded border border-transparent px-2 py-1 text-xs outline-none focus:border-line focus:bg-white disabled:opacity-70"
                        value={s.section ?? ''}
                        onChange={(e) =>
                          update(s.id, { section: e.target.value })
                        }
                      />
                    )}
                  </td>
                  {!readOnly && (
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        className="text-xs text-red-700"
                        onClick={() => remove(s.id)}
                        disabled={doc.staff.length <= 1}
                        title={
                          doc.staff.length <= 1
                            ? 'Debe quedar al menos 1'
                            : 'Quitar'
                        }
                      >
                        Quitar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
