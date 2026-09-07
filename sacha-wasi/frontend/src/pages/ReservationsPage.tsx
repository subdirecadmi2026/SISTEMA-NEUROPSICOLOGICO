import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'

export function ReservationsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  const [tables, setTables] = useState<Array<{ id: string; name: string }>>([])
  const [form, setForm] = useState({ guest_name: '', guest_phone: '', party_size: '2', reserved_at: '', dining_table_id: '' })
  const [error, setError] = useState('')

  async function load() {
    const [r, l] = await Promise.all([api.reservations(), api.lookups()])
    setRows(r)
    setTables(l.tables)
    setForm((f) => ({ ...f, dining_table_id: f.dining_table_id || l.tables[0]?.id || '' }))
  }
  useEffect(() => { load().catch((e: Error) => setError(e.message)) }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await api.createReservation(form)
    await load()
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-clay-600">{error}</p> : null}
      <form onSubmit={onSubmit} className="grid gap-2 rounded-2xl border bg-white p-4 md:grid-cols-6 dark:border-white/10 dark:bg-forest-900">
        <input required placeholder="Huésped" className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} />
        <input placeholder="Teléfono" className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.guest_phone} onChange={(e) => setForm({ ...form, guest_phone: e.target.value })} />
        <input type="number" className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.party_size} onChange={(e) => setForm({ ...form, party_size: e.target.value })} />
        <input type="datetime-local" className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.reserved_at} onChange={(e) => setForm({ ...form, reserved_at: e.target.value })} />
        <select className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.dining_table_id} onChange={(e) => setForm({ ...form, dining_table_id: e.target.value })}>
          {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button className="rounded-xl bg-forest-800 text-white">Reservar</button>
      </form>
      <ul className="space-y-2 text-sm">
        {rows.map((r) => (
          <li key={String(r.id)} className="flex items-center justify-between rounded-xl border bg-white p-3 dark:border-white/10 dark:bg-forest-900">
            <span>{String(r.guest_name)} · {String(r.status)} · {String(r.reserved_at)}</span>
            <button className="text-forest-700" onClick={() => void api.updateReservation(String(r.id), 'seated').then(load)}>Sentar</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
