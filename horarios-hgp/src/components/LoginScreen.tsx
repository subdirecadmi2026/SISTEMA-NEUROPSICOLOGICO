import { useMemo, useState, type ReactNode } from 'react'
import type { AppUser } from '../types'
import {
  DEMO_PASSWORD,
  authenticateDemo,
  isRevisorRole,
  isValidadorRole,
  primaryDemoUsers,
  roleLabel,
  roleMission,
} from '../lib/auth'
import type { UserRole } from '../types'

type Props = {
  onLogin: (user: AppUser) => void
}

type RoleVisual = {
  id: string
  title: string
  action: string
  accent: string
  selected: string
  Illustration: () => ReactNode
}

function IlluJefe() {
  return (
    <svg viewBox="0 0 160 110" className="h-full w-full" aria-hidden>
      <rect x="8" y="12" width="144" height="86" rx="10" fill="#1c3a5c" />
      <rect x="18" y="24" width="70" height="8" rx="2" fill="#5bb8b0" />
      <rect x="18" y="40" width="124" height="6" rx="2" fill="#d9ebe9" opacity=".85" />
      <rect x="18" y="52" width="124" height="6" rx="2" fill="#d9ebe9" opacity=".55" />
      <rect x="18" y="64" width="90" height="6" rx="2" fill="#d9ebe9" opacity=".4" />
      <rect x="18" y="78" width="48" height="12" rx="4" fill="#2e7d84" />
      <circle cx="128" cy="36" r="14" fill="#f3efe6" />
      <path d="M120 36h16M128 28v16" stroke="#1c3a5c" strokeWidth="3" />
    </svg>
  )
}

function IlluRevisor() {
  return (
    <svg viewBox="0 0 160 110" className="h-full w-full" aria-hidden>
      <rect x="20" y="14" width="90" height="82" rx="8" fill="#fff" stroke="#1c3a5c" strokeWidth="3" />
      <rect x="32" y="28" width="66" height="6" rx="2" fill="#d5dee6" />
      <rect x="32" y="42" width="66" height="6" rx="2" fill="#d5dee6" />
      <rect x="32" y="56" width="44" height="6" rx="2" fill="#d5dee6" />
      <circle cx="118" cy="70" r="26" fill="#2e7d84" />
      <path
        d="M106 70l8 8 16-18"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IlluValidador() {
  return (
    <svg viewBox="0 0 160 110" className="h-full w-full" aria-hidden>
      <rect x="14" y="18" width="78" height="74" rx="8" fill="#1c3a5c" />
      <rect x="24" y="30" width="58" height="8" rx="2" fill="#5bb8b0" />
      <rect x="24" y="46" width="58" height="5" rx="2" fill="#d9ebe9" opacity=".7" />
      <rect x="24" y="56" width="40" height="5" rx="2" fill="#d9ebe9" opacity=".45" />
      <rect x="100" y="28" width="46" height="46" rx="6" fill="#fff" stroke="#2e7d84" strokeWidth="3" />
      <rect x="108" y="36" width="12" height="12" fill="#1c3a5c" />
      <rect x="126" y="36" width="12" height="12" fill="#1c3a5c" />
      <rect x="108" y="54" width="12" height="12" fill="#1c3a5c" />
      <rect x="126" y="54" width="12" height="12" fill="#2e7d84" />
      <text x="123" y="98" textAnchor="middle" fontSize="9" fill="#1c3a5c" fontWeight="700">
        QR
      </text>
    </svg>
  )
}

function IlluAdmin() {
  return (
    <svg viewBox="0 0 160 110" className="h-full w-full" aria-hidden>
      <rect x="18" y="20" width="52" height="36" rx="8" fill="#1c3a5c" />
      <rect x="78" y="20" width="52" height="36" rx="8" fill="#2e7d84" />
      <rect x="18" y="64" width="52" height="26" rx="8" fill="#5bb8b0" />
      <rect x="78" y="64" width="52" height="26" rx="8" fill="#d9ebe9" stroke="#1c3a5c" strokeWidth="2" />
      <circle cx="132" cy="30" r="10" fill="#f3efe6" />
      <path d="M128 30h8M132 26v8" stroke="#1c3a5c" strokeWidth="2.5" />
    </svg>
  )
}

const ROLE_VISUALS: RoleVisual[] = [
  {
    id: 'u-jefe',
    title: 'Jefe de servicio',
    action: 'Elaborar horarios',
    accent: 'border-teal/30 bg-teal/5',
    selected: 'border-teal ring-2 ring-teal/40 bg-teal/10',
    Illustration: IlluJefe,
  },
  {
    id: 'u-revisor',
    title: 'Revisor',
    action: 'Revisar y aprobar',
    accent: 'border-navy/20 bg-navy/5',
    selected: 'border-navy ring-2 ring-navy/30 bg-navy/10',
    Illustration: IlluRevisor,
  },
  {
    id: 'u-validador',
    title: 'Validador',
    action: 'Validar horarios (Talento Humano)',
    accent: 'border-teal-soft/40 bg-teal-soft/10',
    selected: 'border-teal-soft ring-2 ring-teal-soft/50 bg-teal-soft/15',
    Illustration: IlluValidador,
  },
  {
    id: 'u-admin',
    title: 'Administrador',
    action: 'Administrar el sistema',
    accent: 'border-line bg-sand/50',
    selected: 'border-navy ring-2 ring-navy/25 bg-sand',
    Illustration: IlluAdmin,
  },
]

/**
 * Login en 2 pasos: 1) elegir imagen del rol  2) validar usuario + contraseña.
 */
export function LoginScreen({ onLogin }: Props) {
  const primary = primaryDemoUsers()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [step, setStep] = useState<'elige' | 'credenciales'>('elige')

  const selectedUser = useMemo(
    () => primary.find((u) => u.id === selectedId) ?? null,
    [primary, selectedId],
  )

  const visual = ROLE_VISUALS.find((r) => r.id === selectedId)

  function pickRole(id: string) {
    const u = primary.find((x) => x.id === id)
    setSelectedId(id)
    setError('')
    setPassword('')
    setUsuario(u?.email ?? '')
    setStep('credenciales')
  }

  function backToRoles() {
    setStep('elige')
    setError('')
    setPassword('')
  }

  function roleFitsCard(role: UserRole, cardId: string): boolean {
    if (cardId === 'u-admin') return role === 'admin'
    if (cardId === 'u-jefe') return role === 'lider_servicio'
    if (cardId === 'u-revisor') return isRevisorRole(role) && role !== 'admin'
    if (cardId === 'u-validador')
      return isValidadorRole(role) && role !== 'admin'
    // fallback: same id as demo seed
    return false
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) {
      setError('Seleccione primero qué va a hacer (su perfil)')
      setStep('elige')
      return
    }
    // Autentica cualquier usuario gestionado (demo o creado por admin)
    const result = authenticateDemo(usuario, password)
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (!roleFitsCard(result.user.role, selectedId)) {
      setError(
        `El usuario «${result.user.email}» no corresponde al perfil «${visual?.title ?? 'seleccionado'}». Elija la imagen correcta.`,
      )
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

      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <img
            src="/logo_msp.png"
            alt="Ministerio de Salud Pública"
            className="h-14 w-auto rounded-lg bg-white p-1.5 shadow-sm"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
              MSP Ecuador
            </p>
            <h1 className="font-display text-3xl leading-tight text-navy sm:text-4xl">
              Hospital General Puyo
            </h1>
            <p className="text-sm text-muted">
              Acceso al sistema de horarios · seleccione su función e inicie sesión
            </p>
          </div>
        </div>

        {step === 'elige' ? (
          <section className="rounded-3xl border border-line/80 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6">
            <h2 className="font-display text-2xl text-navy">
              ¿Qué va a hacer?
            </h2>
            <p className="mt-1 text-sm text-muted">
              Elija la imagen de su perfil. Después deberá validar con usuario y
              contraseña.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {ROLE_VISUALS.map((role) => {
                // Siempre mostrar Jefe, Revisor, Validador y Admin
                const u =
                  primary.find((x) => x.id === role.id) ??
                  ({
                    id: role.id,
                    email: '',
                    name: role.title,
                    role:
                      role.id === 'u-jefe'
                        ? 'lider_servicio'
                        : role.id === 'u-revisor'
                          ? 'revisor'
                          : role.id === 'u-validador'
                            ? 'validador'
                            : 'admin',
                    serviceUnits: [],
                  } as AppUser)
                const Illu = role.Illustration
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => pickRole(role.id)}
                    className={`group overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 hover:shadow-md ${role.accent}`}
                  >
                    <div className="h-28 bg-gradient-to-br from-white/80 to-transparent px-3 pt-3 sm:h-32">
                      <Illu />
                    </div>
                    <div className="border-t border-line/60 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-teal">
                        {role.action}
                      </p>
                      <p className="font-display text-lg text-navy">
                        {role.title}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {roleMission(u.role)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        ) : (
          <section className="mx-auto grid max-w-3xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div
              className={`overflow-hidden rounded-3xl border ${visual?.selected ?? 'border-line'} bg-white shadow-sm`}
            >
              <div className="h-36 px-4 pt-4">
                {visual ? <visual.Illustration /> : null}
              </div>
              <div className="border-t border-line px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-teal">
                  {visual?.action}
                </p>
                <p className="font-display text-xl text-navy">
                  {visual?.title}
                </p>
                {selectedUser ? (
                  <p className="mt-1 text-sm text-muted">
                    Perfil: {selectedUser.name}
                    <br />
                    <span className="text-xs">
                      {roleLabel(selectedUser.role)}
                    </span>
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={backToRoles}
                  className="mt-3 text-xs font-semibold text-teal underline"
                >
                  ← Cambiar imagen / perfil
                </button>
              </div>
            </div>

            <form
              onSubmit={submitForm}
              className="rounded-3xl border border-line bg-white/95 p-5 shadow-sm sm:p-6"
            >
              <h2 className="font-display text-xl text-navy">
                Validar acceso
              </h2>
              <p className="mt-1 text-xs text-muted">
                Ingrese usuario y contraseña del perfil seleccionado.
                Demo: <code className="rounded bg-sand px-1 font-semibold">{DEMO_PASSWORD}</code>
              </p>

              <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted">
                Usuario (correo)
                <input
                  type="email"
                  autoComplete="username"
                  autoFocus
                  required
                  className="mt-1 w-full rounded-xl border border-line bg-sand/30 px-3 py-2.5 text-sm text-ink"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="correo@hgp.gob.ec"
                />
              </label>
              <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted">
                Contraseña
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  className="mt-1 w-full rounded-xl border border-line bg-sand/30 px-3 py-2.5 text-sm text-ink"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </label>

              {error ? (
                <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                className="mt-5 w-full rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white hover:bg-navy-deep"
              >
                Iniciar sesión
              </button>
              {selectedUser ? (
                <p className="mt-3 text-center text-[11px] text-muted">
                  Usuario sugerido: {selectedUser.email}
                </p>
              ) : null}
            </form>
          </section>
        )}
      </div>
    </main>
  )
}
