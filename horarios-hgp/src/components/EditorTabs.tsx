export type EditorTabId =
  | 'horario'
  | 'claves'
  | 'distribucion'
  | 'contingencia'
  | 'personal'
  | 'permisos'
  | 'imprimir'

const TABS: { id: EditorTabId; label: string; short: string }[] = [
  { id: 'horario', label: 'Horario', short: 'Horario' },
  { id: 'claves', label: 'Claves', short: 'Claves' },
  { id: 'distribucion', label: 'Distribución', short: 'Áreas' },
  { id: 'contingencia', label: 'Contingencia', short: 'Cont.' },
  { id: 'personal', label: 'Personal', short: 'Pers.' },
  { id: 'permisos', label: 'Permisos', short: 'Perm.' },
  { id: 'imprimir', label: 'Imprimir', short: 'Print' },
]

type Props = {
  tab: EditorTabId
  onChange: (id: EditorTabId) => void
}

/** Navegación de pestañas del editor (jefe). */
export function EditorTabs({ tab, onChange }: Props) {
  return (
    <nav className="no-print mb-4" aria-label="Secciones del horario">
      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-line bg-white p-1.5 shadow-sm">
        {TABS.map(({ id, label, short }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={active ? 'page' : undefined}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition sm:px-4 ${
                active
                  ? 'bg-navy text-white shadow-sm'
                  : 'text-muted hover:bg-sand hover:text-navy'
              }`}
            >
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{short}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
