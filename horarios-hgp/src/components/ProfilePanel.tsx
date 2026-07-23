import { useState } from 'react'
import type { AppUser } from '../types'
import {
  DEMO_USERS,
  loginAs,
  primaryDemoUsers,
  roleLabel,
  roleMission,
  userInitials,
} from '../lib/auth'
import { FirmaEcSettings } from './FirmaEcSettings'

type Props = {
  user: AppUser
  pendingCount?: number
  open: boolean
  onClose: () => void
  onSwitchUser: (user: AppUser) => void
  onLogout: () => void
  onFlash: (msg: string) => void
}

/**
 * Panel «Mi perfil»: datos de sesión, FirmaEC y cambio de usuario.
 */
export function ProfilePanel({
  user,
  pendingCount = 0,
  open,
  onClose,
  onSwitchUser,
  onLogout,
  onFlash,
}: Props) {
  const [switchOpen, setSwitchOpen] = useState(false)
  const primary = primaryDemoUsers()

  if (!open) return null

  return (
    <div
      className="no-print fixed inset-0 z-[70] flex justify-end bg-navy/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-panel-title"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-line bg-navy px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal font-display text-lg">
                {userInitials(user.name)}
              </span>
              <div>
                <h2
                  id="profile-panel-title"
                  className="font-display text-xl leading-tight"
                >
                  Mi perfil
                </h2>
                <p className="text-xs text-white/70">{roleLabel(user.role)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/25 px-2 py-1 text-xs hover:bg-white/10"
            >
              Cerrar
            </button>
          </div>
        </header>

        <div className="space-y-4 p-5">
          <section className="rounded-2xl border border-line bg-sand/30 p-4">
            <p className="font-display text-lg text-navy">{user.name}</p>
            <p className="text-sm text-muted">{user.email}</p>
            <p className="mt-2 text-sm text-ink">{roleMission(user.role)}</p>
            {pendingCount > 0 ? (
              <p className="mt-2 rounded-lg bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-950">
                {pendingCount} pendiente(s) en su bandeja
              </p>
            ) : null}
            {user.serviceUnits.length > 0 ? (
              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Servicios a cargo
                </p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {user.serviceUnits.map((u) => (
                    <li
                      key={u}
                      className="rounded-md border border-line bg-white px-2 py-0.5 text-xs text-navy"
                    >
                      {u}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Firma electrónica
            </h3>
            <p className="mb-2 text-xs text-muted">
              Cargue su .p12 FirmaEC o una imagen de firma para estampar con QR.
            </p>
            <FirmaEcSettings user={user} onFlash={onFlash} tone="panel" />
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Cambiar de perfil
              </h3>
              <button
                type="button"
                onClick={() => setSwitchOpen((v) => !v)}
                className="text-xs font-semibold text-teal underline"
              >
                {switchOpen ? 'Ocultar' : 'Ver perfiles'}
              </button>
            </div>
            {switchOpen ? (
              <ul className="space-y-1 rounded-xl border border-line p-2">
                {primary.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      disabled={u.id === user.id}
                      onClick={() => {
                        onSwitchUser(loginAs(u))
                        onClose()
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-sand disabled:opacity-40"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                        {userInitials(u.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-navy">
                          {roleLabel(u.role).replace(' (visualización)', '')}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {u.name}
                        </span>
                      </span>
                      {u.id === user.id ? (
                        <span className="text-[10px] font-bold text-teal">
                          Actual
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
                <li className="border-t border-line pt-1">
                  <label className="block px-2 py-1 text-[10px] font-semibold uppercase text-muted">
                    Otro usuario
                    <select
                      className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-1.5 text-xs"
                      defaultValue=""
                      onChange={(e) => {
                        const u = DEMO_USERS.find((x) => x.id === e.target.value)
                        if (u) {
                          onSwitchUser(loginAs(u))
                          onClose()
                        }
                      }}
                    >
                      <option value="" disabled>
                        Elegir…
                      </option>
                      {DEMO_USERS.filter(
                        (u) => !primary.some((p) => p.id === u.id),
                      ).map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} · {roleLabel(u.role)}
                        </option>
                      ))}
                    </select>
                  </label>
                </li>
              </ul>
            ) : null}
          </section>
        </div>

        <footer className="mt-auto border-t border-line p-5">
          <button
            type="button"
            onClick={() => {
              onLogout()
              onClose()
            }}
            className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-900 hover:bg-rose-100"
          >
            Cerrar sesión
          </button>
        </footer>
      </aside>
    </div>
  )
}
