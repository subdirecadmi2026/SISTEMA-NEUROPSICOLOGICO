import type { AppUser } from '../types'
import { DEMO_USERS, loginAs, roleLabel } from '../lib/auth'

type Props = {
  user: AppUser | null
  onLogin: (u: AppUser) => void
  onLogout: () => void
}

const QUICK = ['u-lider', 'u-dir', 'u-th', 'u-admin'] as const

export function AuthBar({ user, onLogin, onLogout }: Props) {
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
              className="rounded-lg border border-white/30 bg-white/10 px-2 py-1 text-xs font-semibold hover:bg-white/20"
              title={u.email}
            >
              {roleLabel(u.role)}
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
