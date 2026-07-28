import { useMemo, useState } from 'react'
import { DEMO_PASSWORD, roleLabel } from '../lib/auth'
import {
  AUTHORITY_KIND_DEFAULT_CARGO,
  AUTHORITY_KIND_LABEL,
  MAX_AUTHORITIES,
  type AuthorityKind,
  type HospitalSigner,
  type SignersConfig,
  addAuthority,
  authorityCount,
  createOrUpdateUserFromSigner,
  fullSignerName,
  getSignersConfig,
  removeAuthority,
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
  'direccion_asistencial',
  'direccion_medica',
  'gerencia',
  'talento_humano',
]

/**
 * Admin: autoridades que respaldan y validan el horario.
 * La 1.ª firma (Jefe de servicio) es automática desde el horario.
 * Puede crear, editar o eliminar autoridades según necesite.
 */
export function AdminFirmasPanel({ onFlash }: Props) {
  const [cfg, setCfg] = useState<SignersConfig>(() => getSignersConfig())
  const [passwords, setPasswords] = useState<Record<string, string>>({})
  const [newKind, setNewKind] = useState<AuthorityKind>('direccion_asistencial')
  const [tick, setTick] = useState(0)

  const ordered = useMemo(
    () => [...cfg.signers].sort((a, b) => a.order - b.order),
    [cfg.signers, tick],
  )
  const authorities = authorityCount(cfg)
  const canAdd = authorities < MAX_AUTHORITIES

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
      `Plantilla ${count} firmas = 1 jefe + ${count - 1} autoridad(es)`,
    )
  }

  function onAdd() {
    try {
      refresh(addAuthority(newKind))
      onFlash(`Autoridad agregada: ${AUTHORITY_KIND_LABEL[newKind]}`)
    } catch (e) {
      onFlash(e instanceof Error ? e.message : 'No se pudo agregar')
    }
  }

  function onRemove(s: HospitalSigner) {
    const name = fullSignerName(s) || AUTHORITY_KIND_LABEL[s.kind]
    if (
      !window.confirm(
        `¿Eliminar la autoridad «${name}»?\nYa no aparecerá en el cuadro de firmas.`,
      )
    ) {
      return
    }
    refresh(removeAuthority(s.id))
    setPasswords((p) => {
      const next = { ...p }
      delete next[s.id]
      return next
    })
    onFlash(`Autoridad eliminada · quedan ${Math.max(0, authorities - 1)}`)
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
          <strong>Jefe de servicio</strong> (automática). Aquí puede{' '}
          <strong>crear, editar o eliminar</strong> las autoridades que necesite
          (Dirección Asistencial, Dirección Médica, Gerencia, Talento Humano).
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
          Cuadro actual
        </span>
        <span className="rounded-lg bg-navy/10 px-2.5 py-1 text-sm font-bold text-navy">
          {1 + authorities} firmas
        </span>
        <span className="text-xs text-muted">
          = 1 jefe + <strong>{authorities}</strong> autoridad(es)
        </span>
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
        <span className="text-xs text-muted">Atajo plantilla:</span>
        {([3, 4, 5] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => changeCount(n)}
            className={`rounded-lg border px-2.5 py-1 text-sm font-bold ${
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
          Guardar
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              !window.confirm(
                '¿Restablecer a plantilla de 3 firmas (jefe + 2 autoridades)?',
              )
            )
              return
            refresh(resetSignersToDefaults())
            onFlash('Firmas restablecidas')
          }}
          className="rounded-lg border border-line px-3 py-1.5 text-sm"
        >
          Restablecer
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-dashed border-teal/40 bg-teal/5 p-3">
        <label className="min-w-[12rem] flex-1 text-xs font-semibold text-muted">
          Nueva autoridad · tipo de responsabilidad
          <select
            className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold text-navy"
            value={newKind}
            onChange={(e) => setNewKind(e.target.value as AuthorityKind)}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {AUTHORITY_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!canAdd}
          onClick={onAdd}
          className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Crear autoridad
        </button>
        {!canAdd ? (
          <p className="w-full text-xs text-amber-800">
            Máximo {MAX_AUTHORITIES} autoridades. Elimine una si ya no la
            necesita.
          </p>
        ) : null}
      </div>

      {ordered.length === 0 ? (
        <div className="rounded-2xl border border-line bg-sand/40 px-4 py-8 text-center">
          <p className="font-display text-lg text-navy">
            Sin autoridades todavía
          </p>
          <p className="mt-1 text-sm text-muted">
            Solo se imprimirá la firma del jefe. Use «Crear autoridad» para
            agregar Dirección Asistencial, Dirección Médica, Gerencia o Talento
            Humano.
          </p>
        </div>
      ) : null}

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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-sand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                    {AUTHORITY_KIND_LABEL[s.kind]}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(s)}
                    className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800 hover:bg-red-100"
                  >
                    Eliminar
                  </button>
                </div>
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
                  Tipo de responsabilidad
                  <select
                    className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold text-navy"
                    value={s.kind}
                    onChange={(e) => {
                      const kind = e.target.value as AuthorityKind
                      patch(s.id, {
                        kind,
                        cargo: AUTHORITY_KIND_DEFAULT_CARGO[kind],
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
