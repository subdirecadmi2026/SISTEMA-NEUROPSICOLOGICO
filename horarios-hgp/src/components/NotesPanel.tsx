import type { ScheduleDoc } from '../types'

type Props = {
  doc: ScheduleDoc
  readOnly: boolean
  onChange: (doc: ScheduleDoc) => void
}

/** Observaciones del cuadro (salen en impresión y Excel). */
export function NotesPanel({ doc, readOnly, onChange }: Props) {
  return (
    <section className="no-print mb-4 rounded-2xl border border-line bg-white/85 p-4 shadow-sm">
      <h2 className="font-display text-lg text-navy">Observaciones</h2>
      <p className="mb-2 text-xs text-muted">
        Notas del mes para impresión y archivo (permisos especiales, llamados,
        etc.).
      </p>
      <textarea
        disabled={readOnly}
        rows={3}
        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal disabled:opacity-70"
        value={doc.notes}
        placeholder="Ej.: Personal en capacitación los días 10–12 · Cubrir con llamado…"
        onChange={(e) => onChange({ ...doc, notes: e.target.value })}
      />
    </section>
  )
}
