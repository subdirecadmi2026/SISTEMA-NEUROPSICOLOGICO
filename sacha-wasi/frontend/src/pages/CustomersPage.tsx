import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'

export function CustomersPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  const [form, setForm] = useState({ name: '', phone: '', document_number: '', email: '' })
  const [error, setError] = useState('')

  async function load() {
    setRows((await api.customers()).data)
  }
  useEffect(() => { load().catch((e: Error) => setError(e.message)) }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await api.createCustomer(form)
    setForm({ name: '', phone: '', document_number: '', email: '' })
    await load()
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-clay-600">{error}</p> : null}
      <form onSubmit={onSubmit} className="sw-card grid gap-2 rounded-2xl p-4 md:grid-cols-5">
        <input required placeholder="Nombre" className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Cédula" className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} />
        <input placeholder="Teléfono" className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input placeholder="Email" className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <button className="rounded-xl bg-forest-800 text-white">Guardar</button>
      </form>
      <table className="w-full text-left text-sm">
        <thead><tr className="text-ink-500"><th className="py-2">Cliente</th><th>Documento</th><th>Puntos</th><th>Segmento</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.id)} className="border-t border-cream-100 dark:border-white/10">
              <td className="py-2">{String(r.name)}</td>
              <td>{String(r.document_number ?? '')}</td>
              <td>{String(r.points)}</td>
              <td>{String(r.segment)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
