import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'

const denoms = ['100', '50', '20', '10', '5', '1', '0.50', '0.25', '0.10', '0.05', '0.01']

export function CashPage() {
  const [registers, setRegisters] = useState<Array<{ id: string; name: string; code: string; open_session?: { id: string } | null }>>([])
  const [session, setSession] = useState<Record<string, unknown> | null>(null)
  const [registerId, setRegisterId] = useState('')
  const [opening, setOpening] = useState('150')
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    const [regs, current] = await Promise.all([api.cashRegisters(), api.cashCurrent()])
    setRegisters(regs as typeof registers)
    setSession(current)
    setRegisterId((regs[0] as { id: string } | undefined)?.id ?? '')
  }

  useEffect(() => {
    load().catch((e: Error) => setError(e.message))
  }, [])

  async function open(e: FormEvent) {
    e.preventDefault()
    setError('')
    await api.cashOpen({ cash_register_id: registerId, opening_amount: opening })
    setNotice('Caja abierta')
    await load()
  }

  async function close(e: FormEvent) {
    e.preventDefault()
    if (!session?.id) return
    const denominations: Record<string, number> = {}
    for (const d of denoms) denominations[d] = Number(counts[d] || 0)
    const closed = (await api.cashClose(String(session.id), { denominations, notes: 'Arqueo POS' })) as { difference: string; counted_cash: string; system_cash: string }
    setNotice(`Cerrada. Sistema ${closed.system_cash} · contado ${closed.counted_cash} · diferencia ${closed.difference}`)
    await load()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {error ? <p className="col-span-2 text-clay-600">{error}</p> : null}
      {notice ? <p className="col-span-2 text-forest-700">{notice}</p> : null}
      <section className="rounded-2xl border border-cream-100 bg-white p-4 dark:border-white/10 dark:bg-forest-900">
        <h2 className="font-display text-lg">Sesión actual</h2>
        {session ? (
          <div className="mt-3 space-y-1 text-sm">
            <p>Estado: {String(session.status)}</p>
            <p>Fondo: ${Number(session.opening_amount).toFixed(2)}</p>
            <p>Efectivo sistema: ${Number(session.system_cash).toFixed(2)}</p>
            <p>Caja: {(session.register as { name?: string } | undefined)?.name}</p>
          </div>
        ) : (
          <form onSubmit={open} className="mt-3 space-y-2">
            <select className="w-full rounded-xl border px-3 py-2 dark:bg-forest-800" value={registerId} onChange={(e) => setRegisterId(e.target.value)}>
              {registers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <input className="w-full rounded-xl border px-3 py-2 dark:bg-forest-800" value={opening} onChange={(e) => setOpening(e.target.value)} />
            <button className="rounded-xl bg-forest-800 px-4 py-2 text-white">Abrir caja</button>
          </form>
        )}
      </section>
      {session ? (
        <form onSubmit={close} className="rounded-2xl border border-cream-100 bg-white p-4 dark:border-white/10 dark:bg-forest-900">
          <h2 className="font-display text-lg">Arqueo USD</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {denoms.map((d) => (
              <label key={d} className="text-sm">
                ${d}
                <input className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-forest-800" value={counts[d] ?? ''} onChange={(e) => setCounts({ ...counts, [d]: e.target.value })} />
              </label>
            ))}
          </div>
          <button className="mt-4 rounded-xl bg-clay-600 px-4 py-2 text-white">Cerrar caja</button>
        </form>
      ) : null}
    </div>
  )
}
