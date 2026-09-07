import { useEffect, useState } from 'react'
import { api } from '../api/client'

export function SettingsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setData(await api.settings())
  }
  useEffect(() => { load().catch((e: Error) => setError(e.message)) }, [])

  if (!data) return <p>{error || 'Cargando…'}</p>
  const company = data.company as { settings?: { sri_contingency?: boolean }; trade_name?: string }

  return (
    <div className="max-w-xl space-y-4 rounded-2xl border bg-white p-4 dark:border-white/10 dark:bg-forest-900">
      <p className="text-sm text-ink-500">{String(data.sri_notice)}</p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(company.settings?.sri_contingency)}
          onChange={async (e) => {
            await api.updateSettings({ sri_contingency: e.target.checked })
            setNotice(e.target.checked ? 'Contingencia SRI activada (simulador).' : 'Contingencia desactivada.')
            await load()
          }}
        />
        Emitir en contingencia (no autoriza hasta reintentar)
      </label>
      {notice ? <p className="text-sm text-forest-700">{notice}</p> : null}
      <p className="text-xs text-ink-500">Uber Eats, Rappi y pasarelas están como stubs. El delivery interno sí opera.</p>
    </div>
  )
}
