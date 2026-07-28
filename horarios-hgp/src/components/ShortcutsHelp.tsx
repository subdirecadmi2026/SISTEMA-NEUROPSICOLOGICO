type Props = {
  open: boolean
  onToggle: () => void
}

/** Ayuda rápida de atajos y gestos. */
export function ShortcutsHelp({ open, onToggle }: Props) {
  return (
    <section className="no-print mb-4 rounded-2xl border border-line bg-white/85 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-display text-lg text-navy">Atajos y tips</span>
        <span className="text-sm text-muted">{open ? 'Ocultar' : 'Mostrar'}</span>
      </button>
      {open && (
        <div className="border-t border-line px-4 py-3 text-sm text-ink">
          <ul className="grid gap-2 sm:grid-cols-2">
            <li>
              <strong>Ctrl/Cmd + S</strong> — Guardar
            </li>
            <li>
              <strong>Ctrl/Cmd + Z</strong> — Deshacer
            </li>
            <li>
              <strong>L F V</strong> — Libre / Feriado / Vacaciones
            </li>
            <li>
              <strong>C / X / D / N</strong> — CE / X / D1 / N1
            </li>
            <li>
              <strong>Arrastrar</strong> — pintar varias celdas
            </li>
            <li>
              <strong>Clic derecho</strong> — borrar celda o columna (en el día)
            </li>
            <li>
              <strong>Clic en día</strong> — pintar toda la columna
            </li>
            <li>
              <strong>←Copia</strong> — copiar turnos de la fila de arriba
            </li>
          </ul>
        </div>
      )}
    </section>
  )
}
