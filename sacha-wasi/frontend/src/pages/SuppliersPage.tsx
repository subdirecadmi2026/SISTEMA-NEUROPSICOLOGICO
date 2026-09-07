import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'

export function SuppliersPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  const [form, setForm] = useState({ name: '', ruc: '', city: '', phone: '' })
  const [error, setError] = useState('')

  async function load() {
    setRows(await api.suppliers())
  }
  useEffect(() => { load().catch((e: Error) => setError(e.message)) }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await api.createSupplier(form)
    setForm({ name: '', ruc: '', city: '', phone: '' })
    await load()
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-clay-600">{error}</p> : null}
      <form onSubmit={onSubmit} className="grid gap-2 rounded-2xl border bg-white p-4 md:grid-cols-5 dark:border-white/10 dark:bg-forest-900">
        <input required placeholder="Nombre" className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="RUC" className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} />
        <input placeholder="Ciudad" className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <input placeholder="Teléfono" className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <button className="rounded-xl bg-forest-800 text-white">Guardar</button>
      </form>
      <ul className="space-y-2 text-sm">
        {rows.map((r) => <li key={String(r.id)} className="rounded-xl border bg-white p-3 dark:border-white/10 dark:bg-forest-900">{String(r.name)} · {String(r.city ?? '')} · {String(r.ruc ?? '')}</li>)}
      </ul>
    </div>
  )
}
