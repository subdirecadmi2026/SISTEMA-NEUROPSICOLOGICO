import type { ContingencyRow, ScheduleDoc } from '../types'
import { uid } from '../types'

type Props = {
  doc: ScheduleDoc
  readOnly: boolean
  onChange: (doc: ScheduleDoc) => void
}

export function ContingencyPanel({ doc, readOnly, onChange }: Props) {
  function addRow() {
    const row: ContingencyRow = {
      id: uid('cont'),
      name: '',
      coverage: '',
      phone: '',
    }
    onChange({
      ...doc,
      contingencyStaff: [...doc.contingencyStaff, row],
    })
  }

  return (
    <section className="mb-4 rounded-2xl rounded-tl-none border border-line bg-white p-4 shadow-sm">
      <h2 className="font-display text-xl text-navy">Plan de contingencia</h2>
      <p className="mb-3 text-sm text-muted">
        Cobertura ante vacaciones, permisos o ausencias (requerido en plantilla
        médica).
      </p>
      <textarea
        className="mb-3 w-full rounded-lg border border-line px-3 py-2 text-sm disabled:bg-sand/40"
        rows={3}
        disabled={readOnly}
        value={doc.contingencyPlan}
        onChange={(e) => onChange({ ...doc, contingencyPlan: e.target.value })}
        placeholder="Describa cómo se cubren actividades y responsabilidades…"
      />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-sand">
            <tr>
              <th className="border border-line px-2 py-2 text-left">N°</th>
              <th className="border border-line px-2 py-2 text-left">Nombre</th>
              <th className="border border-line px-2 py-2 text-left">
                Cobertura / actividad
              </th>
              <th className="border border-line px-2 py-2 text-left">Teléfono</th>
              {!readOnly && (
                <th className="no-print border border-line px-2 py-2">—</th>
              )}
            </tr>
          </thead>
          <tbody>
            {doc.contingencyStaff.map((c, i) => (
              <tr key={c.id}>
                <td className="border border-line px-2 py-1">{i + 1}</td>
                <td className="border border-line px-1 py-1">
                  <input
                    disabled={readOnly}
                    className="w-full rounded border-0 bg-transparent px-1 py-1 outline-none focus:bg-sand/50 disabled:opacity-70"
                    value={c.name}
                    onChange={(e) =>
                      onChange({
                        ...doc,
                        contingencyStaff: doc.contingencyStaff.map((r) =>
                          r.id === c.id ? { ...r, name: e.target.value } : r,
                        ),
                      })
                    }
                  />
                </td>
                <td className="border border-line px-1 py-1">
                  <input
                    disabled={readOnly}
                    className="w-full rounded border-0 bg-transparent px-1 py-1 outline-none focus:bg-sand/50 disabled:opacity-70"
                    value={c.coverage}
                    onChange={(e) =>
                      onChange({
                        ...doc,
                        contingencyStaff: doc.contingencyStaff.map((r) =>
                          r.id === c.id
                            ? { ...r, coverage: e.target.value }
                            : r,
                        ),
                      })
                    }
                  />
                </td>
                <td className="border border-line px-1 py-1">
                  <input
                    disabled={readOnly}
                    className="w-full rounded border-0 bg-transparent px-1 py-1 outline-none focus:bg-sand/50 disabled:opacity-70"
                    value={c.phone}
                    onChange={(e) =>
                      onChange({
                        ...doc,
                        contingencyStaff: doc.contingencyStaff.map((r) =>
                          r.id === c.id ? { ...r, phone: e.target.value } : r,
                        ),
                      })
                    }
                  />
                </td>
                {!readOnly && (
                  <td className="no-print border border-line px-1 text-center">
                    <button
                      type="button"
                      className="text-xs text-red-700"
                      onClick={() =>
                        onChange({
                          ...doc,
                          contingencyStaff: doc.contingencyStaff.filter(
                            (r) => r.id !== c.id,
                          ),
                        })
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
      {!readOnly && (
        <button
          type="button"
          onClick={addRow}
          className="no-print mt-3 rounded-lg border border-line px-3 py-2 text-sm hover:bg-sand"
        >
          + Agregar fila de contingencia
        </button>
      )}
    </section>
  )
}
