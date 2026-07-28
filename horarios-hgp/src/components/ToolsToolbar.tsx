import { useState, type ReactNode } from 'react'

export type ToolBtn = {
  id: string
  label: string
  onClick: () => void
  disabled?: boolean
  title?: string
  emphasis?: 'teal' | 'navy' | 'default' | 'danger'
}

type Props = {
  primary: ToolBtn[]
  groups: Array<{ title: string; items: ToolBtn[] }>
  extras?: ReactNode
  /** Texto de estado (autoguardado, etc.) */
  statusHint?: string
}

function btnClass(emphasis?: ToolBtn['emphasis'], size: 'sm' | 'md' = 'md') {
  const pad = size === 'sm' ? 'px-3 py-2 text-xs' : 'px-3.5 py-2.5 text-sm'
  if (emphasis === 'teal') {
    return `${pad} rounded-xl border border-teal/35 bg-teal text-white font-semibold shadow-sm hover:brightness-110 disabled:opacity-40`
  }
  if (emphasis === 'navy') {
    return `${pad} rounded-xl border border-navy/20 bg-navy text-white font-semibold shadow-sm hover:bg-navy-deep disabled:opacity-40`
  }
  if (emphasis === 'danger') {
    return `${pad} rounded-xl border border-rose-200 bg-rose-50 text-rose-900 font-semibold hover:bg-rose-100 disabled:opacity-40`
  }
  return `${pad} rounded-xl border border-line bg-white text-navy font-medium hover:border-teal/40 hover:bg-sand/60 disabled:opacity-40`
}

/**
 * Un solo módulo de herramientas: acciones rápidas + secciones (Completar / Personal / Vista).
 */
export function ToolsToolbar({ primary, groups, extras, statusHint }: Props) {
  const sections = [
    ...groups.map((g) => ({ id: g.title, label: g.title, items: g.items })),
    ...(extras
      ? [{ id: 'vista', label: 'Vista', items: [] as ToolBtn[] }]
      : []),
  ]
  const [tab, setTab] = useState(sections[0]?.id ?? 'vista')
  const active = sections.find((s) => s.id === tab) ?? sections[0]

  return (
    <section className="no-print mb-4 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-gradient-to-r from-navy/[0.04] to-teal/[0.06] px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Elaboración
          </p>
          <h2 className="font-display text-lg leading-tight text-navy">
            Herramientas del mes
          </h2>
        </div>
        {statusHint && (
          <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-muted ring-1 ring-line">
            {statusHint}
          </span>
        )}
      </div>

      {/* Acciones principales — siempre visibles */}
      <div className="border-b border-line px-4 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
          Acciones rápidas
        </p>
        <div className="flex flex-wrap gap-2">
          {primary.map((b) => (
            <button
              key={b.id}
              type="button"
              disabled={b.disabled}
              title={b.title}
              onClick={b.onClick}
              className={btnClass(b.emphasis)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de sección — un solo módulo */}
      {sections.length > 0 && (
        <div className="px-4 pt-3">
          <div
            className="inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-sand/70 p-1"
            role="tablist"
            aria-label="Secciones de herramientas"
          >
            {sections.map((s) => {
              const on = s.id === tab
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setTab(s.id)}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                    on
                      ? 'bg-navy text-white shadow-sm'
                      : 'text-muted hover:bg-white hover:text-navy'
                  }`}
                >
                  {s.label === 'Completar celdas'
                    ? 'Completar'
                    : s.label === 'Personal y copias'
                      ? 'Personal'
                      : s.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Contenido de la sección activa */}
      <div className="px-4 py-4">
        {active?.id === 'vista' && extras ? (
          <div className="flex flex-wrap items-center gap-2">{extras}</div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(active?.items ?? []).map((b) => (
              <button
                key={b.id}
                type="button"
                disabled={b.disabled}
                title={b.title}
                onClick={b.onClick}
                className={`${btnClass(
                  b.id === 'clear' ? 'danger' : b.emphasis,
                  'sm',
                )} w-full text-left`}
              >
                {b.label}
              </button>
            ))}
            {(active?.items ?? []).length === 0 && active?.id !== 'vista' && (
              <p className="text-sm text-muted">Sin acciones en esta sección.</p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
