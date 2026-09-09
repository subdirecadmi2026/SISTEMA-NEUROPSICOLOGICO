import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'

export function SettingsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ trade_name: '', email: '', phone: '', address: '' })

  async function load() {
    const next = await api.settings()
    setData(next)
    const company = next.company as { trade_name?: string; email?: string; phone?: string; address?: string }
    setForm({
      trade_name: company.trade_name ?? '',
      email: company.email ?? '',
      phone: company.phone ?? '',
      address: company.address ?? '',
    })
  }
  useEffect(() => { load().catch((e: Error) => setError(e.message)) }, [])

  if (!data) return <p>{error || 'Cargando…'}</p>
  const company = data.company as { settings?: { sri_contingency?: boolean } }
  const integrations = data.integrations as Record<string, string>

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    await api.updateSettings(form)
    setNotice('Datos de casa actualizados.')
    await load()
  }

  return (
    <div className="grid max-w-3xl gap-4 lg:grid-cols-2">
      <form onSubmit={saveProfile} className="sw-card space-y-3 rounded-2xl p-4">
        <h2 className="font-display text-lg text-forest-800 dark:text-cream-50">Casa y contacto</h2>
        <label className="block text-sm">
          Nombre comercial
          <input className="sw-input mt-1" value={form.trade_name} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} />
        </label>
        <label className="block text-sm">
          Correo
          <input className="sw-input mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="block text-sm">
          Teléfono
          <input className="sw-input mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <label className="block text-sm">
          Dirección
          <input className="sw-input mt-1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </label>
        <button className="sw-btn rounded-xl px-4 py-2">Guardar</button>
      </form>

      <div className="space-y-4">
        <section className="sw-card space-y-3 rounded-2xl p-4">
          <h2 className="font-display text-lg text-forest-800 dark:text-cream-50">SRI (simulador)</h2>
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
        </section>
        <section className="sw-card space-y-2 rounded-2xl p-4">
          <h2 className="font-display text-lg text-forest-800 dark:text-cream-50">Integraciones externas</h2>
          <p className="text-sm text-ink-500">Uber Eats, Rappi y pasarelas de tarjeta no están conectadas. El delivery interno, efectivo y transferencia sí operan.</p>
          <ul className="text-xs uppercase tracking-wide text-clay-600">
            {Object.entries(integrations ?? {}).map(([key, value]) => (
              <li key={key}>{key.replaceAll('_', ' ')} · {value}</li>
            ))}
          </ul>
        </section>
        {notice ? <p className="text-sm text-forest-700">{notice}</p> : null}
      </div>
    </div>
  )
}
