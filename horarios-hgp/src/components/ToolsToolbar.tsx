import type { ReactNode } from 'react'

type Btn = {
  id: string
  label: string
  onClick: () => void
  disabled?: boolean
  title?: string
  emphasis?: 'teal' | 'navy' | 'default'
}

type Props = {
  primary: Btn[]
  groups: Array<{ title: string; items: Btn[] }>
  extras?: ReactNode
}

function btnClass(emphasis?: Btn['emphasis']) {
  if (emphasis === 'teal') {
    return 'rounded-lg border border-teal/40 bg-teal/5 px-3 py-2 text-sm font-semibold text-navy hover:bg-teal/10 disabled:opacity-50'
  }
  if (emphasis === 'navy') {
    return 'rounded-lg border border-navy/30 bg-navy/5 px-3 py-2 text-sm font-semibold text-navy hover:bg-navy/10 disabled:opacity-50'
  }
  return 'rounded-lg border border-line bg-white px-3 py-2 text-sm hover:bg-sand disabled:opacity-50'
}

/** Barra de herramientas agrupada (evita el mar de botones). */
export function ToolsToolbar({ primary, groups, extras }: Props) {
  return (
    <section className="no-print mb-4 space-y-2 rounded-2xl border border-line bg-white/90 p-3 shadow-sm">
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
        {extras}
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        {groups.map((g) => (
          <details key={g.title} className="rounded-xl border border-line bg-sand/30">
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-navy">
              {g.title}
            </summary>
            <div className="flex flex-wrap gap-2 border-t border-line px-3 py-2">
              {g.items.map((b) => (
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
          </details>
        ))}
      </div>
    </section>
  )
}
