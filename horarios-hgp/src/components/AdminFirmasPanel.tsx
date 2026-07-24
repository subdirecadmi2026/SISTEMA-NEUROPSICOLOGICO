import { useMemo, useState } from 'react'
import {
  DEMO_PASSWORD,
  roleLabel,
} from '../lib/auth'
import {
  SIGNER_KIND_DEFAULT_CARGO,
  SIGNER_KIND_LABEL,
  type HospitalSigner,
  type SignerKind,
  type SignersConfig,
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

const KINDS: SignerKind[] = [
  'elaborado',
  'revisado',
  'aprobado',
  'validado',
  'visto_bueno',
]

/**
 * Admin: define 3–5 responsables de firma del horario hospitalario,
 * con nombres/apellidos, responsabilidad y creación de usuarios.
 */
export function AdminFirmasPanel({ onFlash }: Props) {
  const [cfg, setCfg] = useState<SignersConfig>(() => getSignersConfig())
  const [passwords, setPasswords] = useState<Record<string, string>>({})
  const [tick, setTick] = useState(0)

  const ordered = useMemo(
    () => [...cfg.signers].sort((a, b) => a.order - b.order),
    [cfg.signers, tick],
  )

  function refresh(next?: SignersConfig) {
    setCfg(next ?? getSignersConfig())
    setTick((n) => n + 1)
  }

  function patch(id: string, patch: Partial<HospitalSigner>) {
    refresh(updateSigner(id, patch))
  }

  function changeCount(count: 3 | 4 | 5) {
    refresh(setSignersCount(count))
    onFlash(`Casillas de firma: ${count}`)
  }

  function saveAll() {
    refresh(saveSignersConfig(cfg))
    onFlash('Responsables de firma guardados')
  }

  function createUser(s: HospitalSigner) {
    try {
      const pwd = passwords[s.id]?.trim()
      const { signer, userId } = createOrUpdateUserFromSigner(s.id, pwd)
      refresh()
      const u = getManagedUser(userId)
      onFlash(
        `Usuario ${u?.email ?? signer.email} listo · rol ${roleLabel(roleForSignerKind(signer.kind))} · firma: ${signer.cargo}`,
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
          Responsables de firmar el horario
        </h2>
        <p className="mt-1 text-sm text-muted">
          Defina 3, 4 o 5 responsables según la necesidad del hospital. Registre
          nombres y apellidos, la responsabilidad que saldrá en la casilla de
          firma, y cree el usuario del sistema.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-3 shadow-sm">
        <span className="text-xs font-semibold text-muted">Cantidad de firmas</span>
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
        <button
          type="button"
          onClick={saveAll}
          className="ml-auto rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white"
        >
          Guardar configuración
        </button>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm('¿Restablecer a 3 firmas vacías por defecto?'))
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
                  Firma {idx + 1}
                  {full ? (
                    <span className="ml-2 text-sm font-sans font-semibold text-teal">
                      · {full}
                    </span>
                  ) : null}
                </p>
                <span className="rounded-md bg-sand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                  {SIGNER_KIND_LABEL[s.kind]}
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
                    placeholder={SIGNER_KIND_DEFAULT_CARGO[s.kind]}
                    onChange={(e) => patch(s.id, { cargo: e.target.value })}
                  />
                </label>
                <label className="text-xs font-semibold text-muted">
                  Tipo de responsabilidad
                  <select
                    className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                    value={s.kind}
                    onChange={(e) => {
                      const kind = e.target.value as SignerKind
                      patch(s.id, {
                        kind,
                        cargo:
                          s.cargo.trim() &&
                          s.cargo !== SIGNER_KIND_DEFAULT_CARGO[s.kind]
                            ? s.cargo
                            : SIGNER_KIND_DEFAULT_CARGO[kind],
                      })
                    }}
                  >
                    {KINDS.map((k) => (
                      <option key={k} value={k}>
                        {SIGNER_KIND_LABEL[k]}
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
                    placeholder="nombre.apellido@hgp.gob.ec"
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
                      · Usuario vinculado:{' '}
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
                  {s.cargo || SIGNER_KIND_DEFAULT_CARGO[s.kind]}
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
