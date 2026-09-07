import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'

export function ExpensesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  const [form, setForm] = useState({ category: 'servicios', description: '', amount: '', incurred_on: new Date().toISOString().slice(0, 10), vendor: '' })
  const [error, setError] = useState('')

  async function load() {
    setRows(await api.expenses())
  }
  useEffect(() => { load().catch((e: Error) => setError(e.message)) }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await api.createExpense(form)
    await load()
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-clay-600">{error}</p> : null}
      <form onSubmit={onSubmit} className="grid gap-2 rounded-2xl border bg-white p-4 md:grid-cols-6 dark:border-white/10 dark:bg-forest-900">
        <select className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          <option value="servicios">Servicios</option>
          <option value="nomina">Nómina</option>
          <option value="alquiler">Alquiler</option>
          <option value="mantenimiento">Mantenimiento</option>
          <option value="otro">Otro</option>
        </select>
        <input required placeholder="Descripción" className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input required placeholder="Monto" className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <input type="date" className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.incurred_on} onChange={(e) => setForm({ ...form, incurred_on: e.target.value })} />
        <input placeholder="Proveedor" className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
        <button className="rounded-xl bg-forest-800 text-white">Registrar</button>
      </form>
      <ul className="space-y-2 text-sm">
        {rows.map((r) => <li key={String(r.id)} className="rounded-xl border bg-white p-3 dark:border-white/10 dark:bg-forest-900">{String(r.incurred_on)} · {String(r.category)} · {String(r.description)} · ${Number(r.amount).toFixed(2)}</li>)}
      </ul>
    </div>
  )
}
