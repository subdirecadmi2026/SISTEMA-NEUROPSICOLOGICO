import { useState } from 'react'
import type { AppUser } from '../types'
import {
  DEMO_PASSWORD,
  authenticateDemo,
  loginAs,
  otherDemoUsers,
  primaryDemoUsers,
  roleLabel,
  roleMission,
  userInitials,
} from '../lib/auth'

type Props = {
  onLogin: (user: AppUser) => void
}

const ACCENT: Record<string, string> = {
  'u-jefe': 'border-teal/40 bg-teal/10 hover:border-teal hover:bg-teal/15',
  'u-revisor':
    'border-navy/25 bg-navy/5 hover:border-navy/50 hover:bg-navy/10',
  'u-validador':
    'border-teal-soft/50 bg-teal-soft/10 hover:border-teal-soft hover:bg-teal-soft/20',
  'u-admin':
    'border-line bg-sand/60 hover:border-navy/40 hover:bg-sand',
}

/**
 * Pantalla de acceso: perfiles del flujo HGP + correo/contraseña demo.
 */
export function LoginScreen({ onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showMore, setShowMore] = useState(false)
  const primary = primaryDemoUsers()
  const others = otherDemoUsers()

  function enterAs(u: AppUser) {
    setError('')
    onLogin(loginAs(u))
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault()
    const result = authenticateDemo(email, password)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
    onLogin(result.user)
  }

  return (
    <main className="no-print relative min-h-[calc(100vh-4.5rem)] overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(900px 420px at 8% 0%, rgba(46,125,132,0.22) 0%, transparent 55%), radial-gradient(700px 380px at 100% 10%, rgba(28,58,92,0.18) 0%, transparent 50%), linear-gradient(165deg, #f7f4ee 0%, #e8eef4 55%, #dce8e7 100%)',
        }}
      />

      <div className="relative mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-16">
        <div>
          <div className="mb-6 flex items-center gap-3">
            <img
              src="/logo_msp.png"
              alt="Ministerio de Salud Pública"
              className="h-16 w-auto rounded-lg bg-white p-1.5 shadow-sm"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
                MSP Ecuador
              </p>
              <h1 className="font-display text-3xl leading-tight text-navy sm:text-4xl">
                Hospital General Puyo
              </h1>
            </div>
          </div>
          <p className="max-w-md text-base text-muted sm:text-lg">
            Sistema de horarios. Elija su perfil para elaborar, revisar o
            validar el cuadro de trabajo.
          </p>
          <ol className="mt-6 space-y-2 text-sm text-ink">
            <li className="flex gap-2">
              <span className="font-display text-teal">1.</span>
              <span>
                <strong>Jefe</strong> elabora y envía a revisión
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-display text-teal">2.</span>
              <span>
                <strong>Revisor</strong> aprueba o devuelve con comentario
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-display text-teal">3.</span>
              <span>
                <strong>Validador</strong> firma con QR y archiva el PDF
              </span>
            </li>
          </ol>
        </div>

        <div className="rounded-3xl border border-line/80 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6">
          <h2 className="font-display text-xl text-navy">Entrar con perfil</h2>
          <p className="mt-1 text-xs text-muted">
            Acceso demo institucional · contraseña:{' '}
            <code className="rounded bg-sand px-1.5 py-0.5 font-semibold text-navy">
              {DEMO_PASSWORD}
            </code>
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {primary.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => enterAs(u)}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  ACCENT[u.id] ?? 'border-line bg-white hover:bg-sand'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy font-display text-sm text-white">
                    {userInitials(u.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-navy">
                      {roleLabel(u.role).replace(' (visualización)', '')}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {u.name}
                    </span>
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-snug text-muted">
                  {roleMission(u.role)}
                </p>
              </button>
            ))}
          </div>

          <form onSubmit={submitForm} className="mt-5 space-y-3 border-t border-line pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              O con correo
            </p>
            <label className="block text-xs font-semibold text-muted">
              Correo institucional
              <input
                type="email"
                autoComplete="username"
                className="mt-1 w-full rounded-xl border border-line bg-sand/30 px-3 py-2.5 text-sm text-ink"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ej. jefe.servicio@hgp.gob.ec"
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Contraseña
              <input
                type="password"
                autoComplete="current-password"
                className="mt-1 w-full rounded-xl border border-line bg-sand/30 px-3 py-2.5 text-sm text-ink"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={DEMO_PASSWORD}
              />
            </label>
            {error ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="w-full rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-deep"
            >
              Iniciar sesión
            </button>
          </form>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="text-xs font-semibold text-teal underline"
            >
              {showMore
                ? 'Ocultar otros perfiles'
                : 'Más perfiles institucionales…'}
            </button>
            {showMore ? (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-line bg-sand/20 p-2">
                {others.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => enterAs(u)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-white"
                    >
                      <span className="font-semibold text-navy">{u.name}</span>
                      <span className="text-muted">{roleLabel(u.role)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}
