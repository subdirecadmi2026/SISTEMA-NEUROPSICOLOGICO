import { useState } from 'react'
import type { AppUser } from '../types'
import { roleLabel, userInitials } from '../lib/auth'
import { ProfilePanel } from './ProfilePanel'

type Props = {
  user: AppUser | null
  pendingCount?: number
  onLogin: (u: AppUser) => void
  onLogout: () => void
  onFlash: (msg: string) => void
}

/**
 * Barra de sesión: sin usuario apunta al login; con sesión abre «Mi perfil».
 */
export function AuthBar({
  user,
  pendingCount = 0,
  onLogin,
  onLogout,
  onFlash,
}: Props) {
  const [profileOpen, setProfileOpen] = useState(false)

  if (!user) {
    return (
      <div className="no-print flex flex-wrap items-center gap-2">
        <span className="rounded-lg border border-white/25 bg-white/10 px-2.5 py-1.5 text-xs text-white/80">
          Sin sesión · use la pantalla de acceso
        </span>
      </div>
    )
  }

  return (
    <>
      <div className="no-print flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-teal-soft/40 bg-teal/20 px-2 py-1 pr-2.5 font-semibold hover:bg-teal/30"
          title="Abrir mi perfil"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-deep text-[11px] font-bold text-white">
            {userInitials(user.name)}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-xs sm:text-sm">{user.name}</span>
            <span className="block text-[10px] font-medium text-teal-soft">
              {roleLabel(user.role).replace(' (visualización)', '')}
            </span>
          </span>
        </button>
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
          onClick={() => setProfileOpen(true)}
          className="rounded-lg border border-white/25 px-2 py-1 text-xs hover:bg-white/10 sm:hidden"
        >
          Perfil
        </button>
      </div>

      <ProfilePanel
        user={user}
        pendingCount={pendingCount}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSwitchUser={onLogin}
        onLogout={onLogout}
        onFlash={onFlash}
      />
    </>
  )
}
