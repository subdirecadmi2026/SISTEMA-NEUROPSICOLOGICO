import { useState } from 'react'
import type { ScheduleDoc, StaffMember } from '../types'
import { createEmptyStaff } from '../lib/staffLibrary'
import { uid } from '../types'
import {
  addStaffFromNameList,
  sortStaffByName,
} from '../lib/scheduleOps'

type Props = {
  doc: ScheduleDoc
  readOnly: boolean
  onChange: (doc: ScheduleDoc) => void
  /** Resalta el panel (p. ej. tras crear horario) */
  highlight?: boolean
}

/**
 * Editor simple y grande para poner los nombres de médicos/personal
 * que constarán en el cuadro de trabajo.
 */
export function NamesEditor({ doc, readOnly, onChange, highlight }: Props) {
  const isMed = doc.serviceType === 'medico'
  const title = isMed
    ? 'Nombres de los médicos / especialistas'
    : 'Nombres del personal de enfermería'
  const named = doc.staff.filter((s) => s.name.trim()).length
  const sorted = [...doc.staff].sort((a, b) => a.order - b.order)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')

  function update(id: string, patch: Partial<StaffMember>) {
    onChange({
      ...doc,
      staff: doc.staff.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })
  }

  function addRow() {
    const base = createEmptyStaff(doc.serviceType, doc.unitName)
    onChange({
      ...doc,
      staff: [
        ...doc.staff,
        {
          ...base,
          id: uid(isMed ? 'med' : 'enf'),
          name: '',
          order: doc.staff.length + 1,
        },
      ],
    })
  }

  function remove(id: string) {
    if (doc.staff.length <= 1) return
    const cells = { ...doc.cells }
    for (const k of Object.keys(cells)) {
      if (k.startsWith(`${id}:`)) delete cells[k]
    }
    onChange({
      ...doc,
      staff: doc.staff
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, order: i + 1 })),
      cells,
    })
  }

  function applyPaste() {
    const next = addStaffFromNameList(doc, pasteText)
    if (next === doc) return
    onChange(next)
    setPasteText('')
    setPasteOpen(false)
  }

  return (
    <section
      className={`no-print mb-4 rounded-2xl border p-4 shadow-sm ${
        highlight
          ? 'border-teal bg-teal/5 ring-2 ring-teal/30'
          : 'border-line bg-white'
      }`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-xl text-navy">{title}</h2>
          <p className="text-sm text-muted">
            Escriba aquí quiénes irán en el horario de{' '}
            <strong>{doc.unitName}</strong>
            {isMed ? ' (médicos / especialistas)' : ''}. Completados:{' '}
            <strong className="text-navy">
              {named}/{doc.staff.length}
            </strong>
            {named < 1 && (
              <span className="ml-2 font-semibold text-red-700">
                · Falta al menos 1 nombre
              </span>
            )}
          </p>
        </div>
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onChange(sortStaffByName(doc))}
              className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-sand"
            >
              Ordenar A–Z
            </button>
            <button
              type="button"
              onClick={() => setPasteOpen((v) => !v)}
              className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-sand"
            >
              Pegar lista
            </button>
            <button
              type="button"
              onClick={addRow}
              className="rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white hover:bg-navy-deep"
            >
              + Agregar {isMed ? 'médico' : 'persona'}
            </button>
          </div>
        )}
      </div>

      {pasteOpen && !readOnly && (
        <div className="mb-3 rounded-xl border border-teal/30 bg-teal/5 p-3">
          <p className="mb-2 text-xs text-muted">
            Pegue un nombre por línea. Se agregan sin duplicar nombres exactos.
          </p>
          <textarea
            rows={5}
            className="mb-2 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
            placeholder={'Dr. Ana Pérez\nDr. Luis Gómez\nDra. María Castro'}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <button
            type="button"
            onClick={applyPaste}
            className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white"
          >
            Agregar nombres
          </button>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-sand/40 px-4 py-6 text-center">
          <p className="mb-3 text-sm text-muted">
            Todavía no hay filas. Agregue los médicos que deben constar.
          </p>
          {!readOnly && (
            <button
              type="button"
              onClick={addRow}
              className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white"
            >
              Agregar primer {isMed ? 'médico' : 'personal'}
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((s, idx) => (
            <li
              key={s.id}
              className={`grid gap-2 rounded-xl border px-3 py-2 sm:items-center ${
                isMed
                  ? 'sm:grid-cols-[2.5rem_1fr_6rem_auto]'
                  : 'sm:grid-cols-[2.5rem_4.5rem_1fr_6rem_auto]'
              } ${
                s.name.trim()
                  ? 'border-line bg-white'
                  : 'border-amber-300 bg-amber-50'
              }`}
            >
              <span className="text-center text-sm font-bold text-muted">
                {idx + 1}
              </span>
              {!isMed && (
                <input
                  disabled={readOnly}
                  aria-label={`FUN fila ${idx + 1}`}
                  className="rounded-lg border border-line bg-white px-2 py-2 text-center text-sm font-bold disabled:opacity-60"
                  value={s.fun}
                  onChange={(e) =>
                    update(s.id, { fun: e.target.value.toUpperCase() })
                  }
                  title="FUN (ENF, AUX, INT…)"
                />
              )}
              <input
                disabled={readOnly}
                aria-label={`Nombre fila ${idx + 1}`}
                autoComplete="name"
                className="rounded-lg border border-line bg-white px-3 py-2 text-base font-medium text-navy outline-none ring-teal focus:ring-2 disabled:opacity-60"
                value={s.name}
                placeholder={
                  isMed
                    ? 'Ej. Dr. Juan Pérez — escriba el nombre completo'
                    : 'Ej. Lic. María Guatatuca — escriba el nombre completo'
                }
                onChange={(e) => update(s.id, { name: e.target.value })}
              />
              <input
                disabled={readOnly}
                aria-label={`Código fila ${idx + 1}`}
                className="rounded-lg border border-line bg-white px-2 py-2 text-center text-sm font-bold text-navy disabled:opacity-60"
                value={s.codigoPersonal}
                onChange={(e) =>
                  update(s.id, {
                    codigoPersonal: e.target.value.toUpperCase(),
                  })
                }
                title="Código habitual (CE, PT1, D1…)"
                placeholder="Cód."
              />
              {!readOnly && (
                <button
                  type="button"
                  className="justify-self-end text-xs text-red-700 hover:underline disabled:opacity-40"
                  disabled={doc.staff.length <= 1}
                  onClick={() => remove(s.id)}
                >
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {readOnly && (
        <p className="mt-3 text-xs text-amber-800">
          Horario bloqueado: no se pueden editar nombres. Inicie sesión como
          admin para reabrir, o cree un horario nuevo.
        </p>
      )}
    </section>
  )
}
