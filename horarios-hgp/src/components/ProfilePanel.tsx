import { useState } from 'react'
import type { AppUser } from '../types'
import {
  DEMO_PASSWORD,
  authenticateDemo,
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
 * Panel «Mi perfil»: datos de sesión y FirmaEC.
 * Cambio de perfil requiere contraseña (no bypass).
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
  const [targetId, setTargetId] = useState('')
  const [switchPassword, setSwitchPassword] = useState('')
  const primary = primaryDemoUsers()

  if (!open) return null

  function trySwitch() {
    const target = primary.find((u) => u.id === targetId)
    if (!target) {
      onFlash('Seleccione un perfil')
      return
    }
    const res = authenticateDemo(target.email, switchPassword, {
      expectedUserId: target.id,
    })
    if (!res.ok) {
      onFlash(res.error)
      return
    }
    onSwitchUser(res.user)
    setSwitchPassword('')
    setTargetId('')
    onClose()
  }

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
                {switchOpen ? 'Ocultar' : 'Requiere contraseña'}
              </button>
            </div>
            {switchOpen ? (
              <div className="space-y-2 rounded-xl border border-line p-3">
                <p className="text-[11px] text-muted">
                  Debe validar la contraseña del perfil destino (demo:{' '}
                  {DEMO_PASSWORD}).
                </p>
                <label className="block text-xs font-semibold text-muted">
                  Perfil
                  <select
                    className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                  >
                    <option value="">Elegir…</option>
                    {primary
                      .filter((u) => u.id !== user.id)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {roleLabel(u.role)} · {u.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Contraseña
                  <input
                    type="password"
                    className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-sm"
                    value={switchPassword}
                    onChange={(e) => setSwitchPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </label>
                <button
                  type="button"
                  onClick={trySwitch}
                  className="w-full rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white"
                >
                  Cambiar sesión
                </button>
              </div>
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
