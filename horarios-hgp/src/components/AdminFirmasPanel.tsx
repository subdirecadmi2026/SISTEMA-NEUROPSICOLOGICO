import { useMemo, useState } from 'react'
import { DEMO_PASSWORD, roleLabel } from '../lib/auth'
import {
  AUTHORITY_KIND_DEFAULT_CARGO,
  AUTHORITY_KIND_LABEL,
  type AuthorityKind,
  type HospitalSigner,
  type SignersConfig,
  authorityCount,
  createOrUpdateUserFromSigner,
  fullSignerName,
  getSignersConfig,
  resetSignersToDefaults,
  roleForSignerKind,
  saveSignersConfig,
  setSignersCount,
  updateSigner,
} from '../lib/signersStore'
import { getManagedUser } from '../lib/usersStore'

type Props = {
  onFlash: (msg: string) => void
}

const KINDS: AuthorityKind[] = [
  'revisado',
  'aprobado',
  'validado',
  'visto_bueno',
]

/**
 * Admin: autoridades que respaldan y validan el horario.
 * La 1.ª firma (Jefe de servicio) es automática desde el horario.
 */
export function AdminFirmasPanel({ onFlash }: Props) {
  const [cfg, setCfg] = useState<SignersConfig>(() => getSignersConfig())
  const [passwords, setPasswords] = useState<Record<string, string>>({})
  const [tick, setTick] = useState(0)

  const ordered = useMemo(
    () => [...cfg.signers].sort((a, b) => a.order - b.order),
    [cfg.signers, tick],
  )
  const authorities = authorityCount(cfg)

  function refresh(next?: SignersConfig) {
    setCfg(next ?? getSignersConfig())
    setTick((n) => n + 1)
  }

  function patch(id: string, patch: Partial<HospitalSigner>) {
    refresh(updateSigner(id, patch))
  }

  function changeCount(count: 3 | 4 | 5) {
    refresh(setSignersCount(count))
    onFlash(
      `Total ${count} firmas = 1 jefe (automático) + ${count - 1} autoridad(es)`,
    )
  }

  function saveAll() {
    refresh(saveSignersConfig(cfg))
    onFlash('Autoridades de firma guardadas')
  }

  function createUser(s: HospitalSigner) {
    try {
      const pwd = passwords[s.id]?.trim()
      const { signer, userId } = createOrUpdateUserFromSigner(s.id, pwd)
      refresh()
      const u = getManagedUser(userId)
      onFlash(
        `Usuario ${u?.email ?? signer.email} listo · rol ${roleLabel(roleForSignerKind(signer.kind))} · ${signer.cargo}`,
      )
    } catch (e) {
      onFlash(e instanceof Error ? e.message : 'No se pudo crear el usuario')
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-navy/20 bg-navy/5 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          Firmas institucionales
        </p>
        <h2 className="font-display text-xl text-navy">
          Autoridades que respaldan y validan
        </h2>
        <p className="mt-1 text-sm text-muted">
          La <strong>primera firma</strong> siempre es el{' '}
          <strong>Jefe de servicio</strong> y se completa sola con los datos del
          horario. Aquí solo elige las autoridades que revisan, aprueban o
          validan (2, 3 o 4 según el hospital).
        </p>
      </div>

      <div className="rounded-2xl border border-teal/30 bg-teal/5 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-teal">
          Firma 1 · automática
        </p>
        <p className="font-display text-lg text-navy">
          Jefe de servicio (Elaborado)
        </p>
        <p className="text-sm text-muted">
          Nombre y cargo salen del horario: campo «Jefe / líder» y la firma al
          enviar a revisión. No se configura en este módulo.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-3 shadow-sm">
        <span className="text-xs font-semibold text-muted">
          Total de firmas en el cuadro
        </span>
        {([3, 4, 5] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => changeCount(n)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-bold ${
              cfg.count === n
                ? 'border-teal bg-teal text-white'
                : 'border-line text-ink hover:border-teal/40'
            }`}
          >
            {n}
          </button>
        ))}
        <span className="text-xs text-muted">
          = 1 jefe + <strong>{authorities}</strong> autoridad(es)
        </span>
        <button
          type="button"
          onClick={saveAll}
          className="ml-auto rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm('¿Restablecer a 3 firmas (jefe + 2 autoridades)?'))
              return
            refresh(resetSignersToDefaults())
            onFlash('Firmas restablecidas')
          }}
          className="rounded-lg border border-line px-3 py-1.5 text-sm"
        >
          Restablecer
        </button>
      </div>

      <div className="grid gap-3">
        {ordered.map((s, idx) => {
          const linked = s.linkedUserId
            ? getManagedUser(s.linkedUserId)
            : undefined
          const full = fullSignerName(s)
          return (
            <div
              key={s.id}
              className="rounded-2xl border border-line bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-lg text-navy">
                  Firma {idx + 2}
                  <span className="ml-2 text-sm font-sans font-normal text-muted">
                    (autoridad)
                  </span>
                  {full ? (
                    <span className="ml-2 text-sm font-sans font-semibold text-teal">
                      · {full}
                    </span>
                  ) : null}
                </p>
                <span className="rounded-md bg-sand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                  {AUTHORITY_KIND_LABEL[s.kind]}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs font-semibold text-muted">
                  Nombres *
                  <input
                    className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                    value={s.nombres}
                    placeholder="Ej. María Fernanda"
                    onChange={(e) => patch(s.id, { nombres: e.target.value })}
                  />
                </label>
                <label className="text-xs font-semibold text-muted">
                  Apellidos *
                  <input
                    className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                    value={s.apellidos}
                    placeholder="Ej. Pérez Guatatuca"
                    onChange={(e) => patch(s.id, { apellidos: e.target.value })}
                  />
                </label>
                <label className="text-xs font-semibold text-muted">
                  Responsabilidad (sale en la firma) *
                  <input
                    className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold text-navy"
                    value={s.cargo}
                    placeholder={AUTHORITY_KIND_DEFAULT_CARGO[s.kind]}
                    onChange={(e) => patch(s.id, { cargo: e.target.value })}
                  />
                </label>
                <label className="text-xs font-semibold text-muted">
                  Función
                  <select
                    className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                    value={s.kind}
                    onChange={(e) => {
                      const kind = e.target.value as AuthorityKind
                      patch(s.id, {
                        kind,
                        cargo:
                          s.cargo.trim() &&
                          s.cargo !== AUTHORITY_KIND_DEFAULT_CARGO[s.kind]
                            ? s.cargo
                            : AUTHORITY_KIND_DEFAULT_CARGO[kind],
                      })
                    }}
                  >
                    {KINDS.map((k) => (
                      <option key={k} value={k}>
                        {AUTHORITY_KIND_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-muted">
                  Correo del usuario *
                  <input
                    type="email"
                    className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                    value={s.email}
                    placeholder="autoridad@hgp.gob.ec"
                    onChange={(e) => patch(s.id, { email: e.target.value })}
                  />
                </label>
                <label className="text-xs font-semibold text-muted">
                  Contraseña (crear / actualizar usuario)
                  <input
                    type="text"
                    className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                    value={passwords[s.id] ?? ''}
                    placeholder={`Vacío = ${DEMO_PASSWORD} (demo)`}
                    onChange={(e) =>
                      setPasswords((p) => ({ ...p, [s.id]: e.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <p className="text-xs text-muted">
                  Rol de acceso:{' '}
                  <strong className="text-navy">
                    {roleLabel(roleForSignerKind(s.kind))}
                  </strong>
                  {linked ? (
                    <>
                      {' '}
                      · Usuario:{' '}
                      <strong className="text-teal">{linked.email}</strong>
                    </>
                  ) : (
                    <span className="text-amber-800"> · Sin usuario aún</span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => createUser(s)}
                  className="ml-auto rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
                >
                  {linked ? 'Actualizar usuario' : 'Crear usuario y vincular'}
                </button>
              </div>

              <div className="mt-3 rounded-xl border border-dashed border-line bg-sand/40 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                  Vista previa casilla
                </p>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy">
                  {s.cargo || AUTHORITY_KIND_DEFAULT_CARGO[s.kind]}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {full || '— Nombres y apellidos —'}
                </p>
                <p className="mt-2 border-t border-line pt-1 text-center text-[10px] text-muted">
                  Firma
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
