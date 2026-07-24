import { useMemo, useState } from 'react'
import type { ScheduleDoc, StaffMember } from '../types'
import { createEmptyStaff } from '../lib/staffLibrary'
import { uid } from '../types'
import {
  addStaffFromNameList,
  sortStaffByName,
} from '../lib/scheduleOps'
import { HabitualCodeSelect } from './HabitualCodeSelect'
import {
  CARGOS_MEDICO,
  RELACIONES_LABORALES,
  SECTIONS_MEDICO,
  formatHabitualCodeLabel,
  habitualTurnoOptions,
} from '../lib/staffOptions'
import { hoursForCode } from '../lib/shiftsStore'

type Props = {
  doc: ScheduleDoc
  readOnly: boolean
  onChange: (doc: ScheduleDoc) => void
  /** Resalta el panel (p. ej. tras crear horario) */
  highlight?: boolean
}

/**
 * Configuración de personal del horario.
 * En médicos: nombre, cargo, relación, sección y clave habitual (8–24 h).
 */
export function NamesEditor({ doc, readOnly, onChange, highlight }: Props) {
  const isMed = doc.serviceType === 'medico'
  const title = isMed
    ? 'Configuración de médicos / especialistas'
    : 'Nombres del personal de enfermería'
  const named = doc.staff.filter((s) => s.name.trim()).length
  const sorted = [...doc.staff].sort((a, b) => a.order - b.order)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [bulkCode, setBulkCode] = useState('')

  const codeSummary = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of doc.staff) {
      if (!s.name.trim()) continue
      const c = (s.codigoPersonal || '—').trim().toUpperCase() || '—'
      map.set(c, (map.get(c) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [doc.staff])

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

  function applyBulkCode() {
    const code = bulkCode.trim().toUpperCase()
    if (!code) return
    onChange({
      ...doc,
      staff: doc.staff.map((s) =>
        s.name.trim() ? { ...s, codigoPersonal: code } : s,
      ),
    })
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
            {isMed ? (
              <>
                Defina quiénes constan en{' '}
                <strong>{doc.unitName}</strong> y su{' '}
                <strong>clave habitual</strong> (CE 8 h, PT 12 h, HE 13 h, X 24
                h…). Completados:{' '}
                <strong className="text-navy">
                  {named}/{doc.staff.length}
                </strong>
              </>
            ) : (
              <>
                Escriba aquí quiénes irán en el horario de{' '}
                <strong>{doc.unitName}</strong>. Completados:{' '}
                <strong className="text-navy">
                  {named}/{doc.staff.length}
                </strong>
              </>
            )}
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

      {isMed && codeSummary.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-navy/15 bg-navy/5 px-3 py-2 text-xs text-ink">
          <span className="font-semibold text-navy">Claves en uso:</span>
          {codeSummary.map(([code, n]) => (
            <span
              key={code}
              className="rounded-md border border-line bg-white px-2 py-0.5 font-semibold"
              title={formatHabitualCodeLabel(doc.serviceType, code)}
            >
              {code}
              {hoursForCode(doc.serviceType, code) > 0
                ? ` (${hoursForCode(doc.serviceType, code)} h)`
                : ''}{' '}
              ×{n}
            </span>
          ))}
        </div>
      )}

      {isMed && !readOnly && (
        <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-teal/25 bg-teal/5 px-3 py-2">
          <label className="text-xs font-semibold text-muted">
            Aplicar clave a todos los nombrados
            <select
              className="mt-1 block min-w-[14rem] rounded-lg border border-line bg-white px-2 py-1.5 text-sm font-bold text-navy"
              value={bulkCode}
              onChange={(e) => setBulkCode(e.target.value)}
            >
              <option value="">Elegir…</option>
              {habitualTurnoOptions('medico').map((o) => (
                <option key={o.code} value={o.code}>
                  {o.code} · {o.hours} h — {o.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!bulkCode}
            onClick={applyBulkCode}
            className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Aplicar
          </button>
        </div>
      )}

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
      ) : isMed ? (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-navy text-left text-white">
              <tr>
                <th className="px-2 py-2 font-semibold">N°</th>
                <th className="px-2 py-2 font-semibold">Nombres y apellidos *</th>
                <th className="px-2 py-2 font-semibold">Cargo</th>
                <th className="px-2 py-2 font-semibold">Relación</th>
                <th className="px-2 py-2 font-semibold">Sección</th>
                <th className="px-2 py-2 font-semibold">Clave habitual</th>
                {!readOnly && <th className="px-2 py-2">—</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, idx) => (
                <tr
                  key={s.id}
                  className={`border-t border-line ${
                    s.name.trim() ? 'bg-white' : 'bg-amber-50'
                  }`}
                >
                  <td className="px-2 py-1.5 text-center text-muted">
                    {idx + 1}
                  </td>
                  <td className="px-1 py-1">
                    <input
                      disabled={readOnly}
                      aria-label={`Nombre fila ${idx + 1}`}
                      autoComplete="name"
                      className="w-full min-w-[160px] rounded-lg border border-line px-2 py-1.5 text-sm font-medium text-navy outline-none ring-teal focus:ring-2 disabled:opacity-60"
                      value={s.name}
                      placeholder="Ej. Dr. Juan Pérez"
                      onChange={(e) => update(s.id, { name: e.target.value })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      disabled={readOnly}
                      list="cargos-medico-list"
                      aria-label={`Cargo fila ${idx + 1}`}
                      className="w-full min-w-[120px] rounded-lg border border-line px-2 py-1.5 text-sm disabled:opacity-60"
                      value={s.role}
                      onChange={(e) => update(s.id, { role: e.target.value })}
                      placeholder="Cargo"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <select
                      disabled={readOnly}
                      aria-label={`Relación fila ${idx + 1}`}
                      className="w-full min-w-[120px] rounded-lg border border-line px-2 py-1.5 text-sm disabled:opacity-60"
                      value={
                        RELACIONES_LABORALES.includes(
                          s.relacionLaboral as (typeof RELACIONES_LABORALES)[number],
                        )
                          ? s.relacionLaboral
                          : s.relacionLaboral || 'LOSEP'
                      }
                      onChange={(e) =>
                        update(s.id, { relacionLaboral: e.target.value })
                      }
                    >
                      {RELACIONES_LABORALES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                      {s.relacionLaboral &&
                      !RELACIONES_LABORALES.includes(
                        s.relacionLaboral as (typeof RELACIONES_LABORALES)[number],
                      ) ? (
                        <option value={s.relacionLaboral}>
                          {s.relacionLaboral}
                        </option>
                      ) : null}
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <select
                      disabled={readOnly}
                      aria-label={`Sección fila ${idx + 1}`}
                      className="w-full min-w-[130px] rounded-lg border border-line px-2 py-1.5 text-xs disabled:opacity-60"
                      value={s.section ?? 'Personal médico'}
                      onChange={(e) =>
                        update(s.id, { section: e.target.value })
                      }
                    >
                      {SECTIONS_MEDICO.map((sec) => (
                        <option key={sec} value={sec}>
                          {sec}
                        </option>
                      ))}
                      {s.section &&
                      !SECTIONS_MEDICO.includes(
                        s.section as (typeof SECTIONS_MEDICO)[number],
                      ) ? (
                        <option value={s.section}>{s.section}</option>
                      ) : null}
                    </select>
                  </td>
                  <td className="px-1 py-1 min-w-[11rem]">
                    <HabitualCodeSelect
                      serviceType="medico"
                      value={s.codigoPersonal}
                      disabled={readOnly}
                      onChange={(codigoPersonal) =>
                        update(s.id, { codigoPersonal })
                      }
                    />
                  </td>
                  {!readOnly && (
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        className="text-xs text-red-700 hover:underline disabled:opacity-40"
                        disabled={doc.staff.length <= 1}
                        onClick={() => remove(s.id)}
                      >
                        Quitar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <datalist id="cargos-medico-list">
            {CARGOS_MEDICO.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((s, idx) => (
            <li
              key={s.id}
              className={`grid gap-2 rounded-xl border px-3 py-2 sm:grid-cols-[2.5rem_4.5rem_1fr_6rem_auto] sm:items-center ${
                s.name.trim()
                  ? 'border-line bg-white'
                  : 'border-amber-300 bg-amber-50'
              }`}
            >
              <span className="text-center text-sm font-bold text-muted">
                {idx + 1}
              </span>
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
              <input
                disabled={readOnly}
                aria-label={`Nombre fila ${idx + 1}`}
                autoComplete="name"
                className="rounded-lg border border-line bg-white px-3 py-2 text-base font-medium text-navy outline-none ring-teal focus:ring-2 disabled:opacity-60"
                value={s.name}
                placeholder="Ej. Lic. María Guatatuca — escriba el nombre completo"
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
                title="Código habitual (D1, N1…)"
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
