import type { AppUser } from '../types'
import { DEMO_USERS, loginAs, roleLabel } from '../lib/auth'

type Props = {
  user: AppUser | null
  pendingCount?: number
  onLogin: (u: AppUser) => void
  onLogout: () => void
}

/** Acceso rápido: los 3 roles del flujo + admin. */
const QUICK = ['u-jefe', 'u-revisor', 'u-validador', 'u-admin'] as const

const SHORT: Record<string, string> = {
  'u-jefe': 'Jefe',
  'u-revisor': 'Revisor',
  'u-validador': 'Validador',
  'u-admin': 'Admin',
}

export function AuthBar({ user, pendingCount = 0, onLogin, onLogout }: Props) {
  if (!user) {
    return (
      <div className="no-print flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-teal-soft">Entrar:</span>
        {QUICK.map((id) => {
          const u = DEMO_USERS.find((x) => x.id === id)
          if (!u) return null
          return (
            <button
              key={id}
              type="button"
              onClick={() => onLogin(loginAs(u))}
              className="rounded-lg border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/20"
              title={`${u.name} · ${u.email}`}
            >
              {SHORT[id] ?? roleLabel(u.role)}
            </button>
          )
        })}
        <select
          className="rounded-lg border border-white/25 bg-navy-deep px-2 py-1.5 text-xs text-white"
          defaultValue=""
          onChange={(e) => {
            const u = DEMO_USERS.find((x) => x.id === e.target.value)
            if (u) onLogin(loginAs(u))
          }}
        >
          <option value="" disabled>
            Más usuarios…
          </option>
          {DEMO_USERS.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({roleLabel(u.role)})
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2 text-sm">
      <span className="rounded-lg border border-teal-soft/40 bg-teal/20 px-2 py-1 font-semibold">
        {user.name} · {roleLabel(user.role)}
      </span>
      {pendingCount > 0 && (
        <span
          className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-navy-deep"
          title="Pendientes en bandeja"
        >
          {pendingCount} pend.
        </span>
      )}
      <button
        type="button"
        onClick={onLogout}
        className="rounded-lg border border-white/25 px-2 py-1 text-xs hover:bg-white/10"
      >
        Salir
      </button>
    </div>
  )
}
