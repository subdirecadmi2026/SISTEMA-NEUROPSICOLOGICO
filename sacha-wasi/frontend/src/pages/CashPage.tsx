import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'

const denoms = ['100', '50', '20', '10', '5', '1', '0.50', '0.25', '0.10', '0.05', '0.01']

export function CashPage() {
  const [registers, setRegisters] = useState<Array<{ id: string; name: string; code: string; open_session?: { id: string } | null }>>([])
  const [session, setSession] = useState<Record<string, unknown> | null>(null)
  const [registerId, setRegisterId] = useState('')
  const [opening, setOpening] = useState('150')
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [move, setMove] = useState({ type: 'in', amount: '', notes: '' })
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

  async function onMove(e: FormEvent) {
    e.preventDefault()
    if (!session?.id) return
    await api.cashMove(String(session.id), move)
    setMove({ type: 'in', amount: '', notes: '' })
    setNotice('Movimiento registrado')
    await load()
  }

  const movements = (session?.movements as Array<{ id: string; type: string; amount: string; notes?: string }> | undefined) ?? []

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {error ? <p className="col-span-2 text-clay-600">{error}</p> : null}
      {notice ? <p className="col-span-2 text-forest-700">{notice}</p> : null}
      <section className="sw-card rounded-2xl p-4">
        <h2 className="font-display text-lg text-forest-800 dark:text-cream-50">Sesión actual</h2>
        {session ? (
          <div className="mt-3 space-y-1 text-sm">
            <p>Estado: {String(session.status)}</p>
            <p>Fondo: ${Number(session.opening_amount).toFixed(2)}</p>
            <p>Efectivo sistema: ${Number(session.system_cash).toFixed(2)}</p>
            <p>Caja: {(session.register as { name?: string } | undefined)?.name}</p>
          </div>
        ) : (
          <form onSubmit={open} className="mt-3 space-y-2">
            <select className="sw-input" value={registerId} onChange={(e) => setRegisterId(e.target.value)}>
              {registers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <input className="sw-input" value={opening} onChange={(e) => setOpening(e.target.value)} />
            <button className="sw-btn rounded-xl px-4 py-2">Abrir caja</button>
          </form>
        )}
      </section>
      {session ? (
        <form onSubmit={close} className="sw-card rounded-2xl p-4">
          <h2 className="font-display text-lg text-forest-800 dark:text-cream-50">Arqueo USD</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {denoms.map((d) => (
              <label key={d} className="text-sm">
                ${d}
                <input className="sw-input mt-1" value={counts[d] ?? ''} onChange={(e) => setCounts({ ...counts, [d]: e.target.value })} />
              </label>
            ))}
          </div>
          <button className="mt-4 rounded-xl bg-clay-600 px-4 py-2 text-white">Cerrar caja</button>
        </form>
      ) : null}
      {session ? (
        <section className="sw-card rounded-2xl p-4 lg:col-span-2">
          <h2 className="font-display text-lg text-forest-800 dark:text-cream-50">Entradas y salidas</h2>
          <form onSubmit={onMove} className="mt-3 grid gap-2 md:grid-cols-4">
            <select className="sw-input" value={move.type} onChange={(e) => setMove({ ...move, type: e.target.value })}>
              <option value="in">Entrada</option>
              <option value="out">Salida</option>
              <option value="drop">Drop / retiro</option>
              <option value="expense">Gasto de caja</option>
              <option value="tip">Propina</option>
            </select>
            <input required placeholder="Monto" className="sw-input" value={move.amount} onChange={(e) => setMove({ ...move, amount: e.target.value })} />
            <input placeholder="Nota" className="sw-input" value={move.notes} onChange={(e) => setMove({ ...move, notes: e.target.value })} />
            <button className="sw-btn rounded-xl">Registrar</button>
          </form>
          <ul className="mt-3 space-y-1 text-sm">
            {movements.length === 0 ? <li className="text-ink-500">Sin movimientos extra.</li> : null}
            {movements.map((m) => (
              <li key={m.id} className="flex justify-between border-t border-cream-100 py-2">
                <span className="capitalize">{m.type} · {m.notes || '—'}</span>
                <span>${Number(m.amount).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
