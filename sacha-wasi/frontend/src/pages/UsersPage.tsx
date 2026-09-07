import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export function UsersPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  const [roles, setRoles] = useState<Array<{ name: string; label?: string }>>([])
  const [form, setForm] = useState({ name: '', email: '', password: 'password', role: 'mesero' })
  const [error, setError] = useState('')

  async function load() {
    const [u, r] = await Promise.all([api.users(), api.roles()])
    setRows(u)
    setRoles(r as Array<{ name: string; label?: string }>)
  }
  useEffect(() => { load().catch((e: Error) => setError(e.message)) }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const branchId = user?.current_branch?.id
    if (!branchId) return
    await api.createUser({ ...form, branch_ids: [branchId] })
    await load()
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-clay-600">{error}</p> : null}
      <form onSubmit={onSubmit} className="grid gap-2 rounded-2xl border bg-white p-4 md:grid-cols-5 dark:border-white/10 dark:bg-forest-900">
        <input required placeholder="Nombre" className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required type="email" placeholder="Email" className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input required type="password" className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select className="rounded-xl border px-3 py-2 dark:bg-forest-800" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {roles.map((r) => <option key={r.name} value={r.name}>{r.label ?? r.name}</option>)}
        </select>
        <button className="rounded-xl bg-forest-800 text-white">Crear</button>
      </form>
      <ul className="space-y-2 text-sm">
        {rows.map((r) => (
          <li key={String(r.id)} className="rounded-xl border bg-white p-3 dark:border-white/10 dark:bg-forest-900">
            {String(r.name)} · {String(r.email)} · {(r.roles as Array<{ name: string }> | undefined)?.map((x) => x.name).join(', ')}
          </li>
        ))}
      </ul>
    </div>
  )
}
