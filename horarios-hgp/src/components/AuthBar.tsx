import type { AppUser } from '../types'
import { DEMO_USERS, loginAs, roleLabel } from '../lib/auth'

type Props = {
  user: AppUser | null
  onLogin: (u: AppUser) => void
  onLogout: () => void
}

export function AuthBar({ user, onLogin, onLogout }: Props) {
  if (!user) {
    return (
      <div className="no-print flex flex-wrap items-center gap-2">
        <label className="text-xs text-white/70">
          Entrar como
          <select
            className="ml-2 rounded-lg border border-white/25 bg-navy-deep px-2 py-1.5 text-sm text-white"
            defaultValue=""
            onChange={(e) => {
              const u = DEMO_USERS.find((x) => x.id === e.target.value)
              if (u) onLogin(loginAs(u))
            }}
          >
            <option value="" disabled>
              Seleccione usuario…
            </option>
            {DEMO_USERS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({roleLabel(u.role)})
              </option>
            ))}
          </select>
        </label>
      </div>
    )
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2 text-sm">
      <span className="rounded-lg border border-white/20 bg-white/10 px-2 py-1">
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
