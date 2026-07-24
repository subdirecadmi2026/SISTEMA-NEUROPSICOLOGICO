import type { ScheduleDoc, UserRole } from '../types'
import { uid } from '../types'
import { upsertManagedUser, getManagedUser } from './usersStore'
import type { FirmaEcSlot } from './firmaEc'

const KEY = 'hgp-hospital-signers-v1'

/**
 * Autoridades que respaldan / validan el horario.
 * La 1.ª firma (Jefe de servicio · Elaborado) NO se configura aquí:
 * toma datos del horario (jefeServicio / elaboradoPor / firma electrónica).
 */
export type AuthorityKind =
  | 'revisado'
  | 'aprobado'
  | 'validado'
  | 'visto_bueno'

/** @deprecated use AuthorityKind — se mantiene por compatibilidad de datos viejos */
export type SignerKind = AuthorityKind | 'elaborado'

export type HospitalSigner = {
  id: string
  nombres: string
  apellidos: string
  /** Responsabilidad / cargo en la casilla de firma. */
  cargo: string
  kind: AuthorityKind
  email: string
  linkedUserId?: string
  order: number
  active: boolean
}

export type SignersConfig = {
  /**
   * Total de casillas en el horario (incluye la del jefe).
   * 3 = jefe + 2 autoridades; 4 = jefe + 3; 5 = jefe + 4.
   */
  count: 3 | 4 | 5
  /** Solo autoridades (sin el jefe). */
  signers: HospitalSigner[]
}

export const AUTHORITY_KIND_LABEL: Record<AuthorityKind, string> = {
  revisado: 'Revisa / respalda',
  aprobado: 'Aprueba',
  validado: 'Valida (Talento Humano)',
  visto_bueno: 'Visto bueno',
}

export const AUTHORITY_KIND_DEFAULT_CARGO: Record<AuthorityKind, string> = {
  revisado: 'Revisor',
  aprobado: 'Director / Subdirector',
  validado: 'Talento Humano',
  visto_bueno: 'Visto bueno institucional',
}

/** Alias para UI antigua. */
export const SIGNER_KIND_LABEL: Record<SignerKind, string> = {
  elaborado: 'Jefe de servicio (automático)',
  ...AUTHORITY_KIND_LABEL,
}

export const SIGNER_KIND_DEFAULT_CARGO: Record<SignerKind, string> = {
  elaborado: 'Jefe de servicio',
  ...AUTHORITY_KIND_DEFAULT_CARGO,
}

const AUTHORITY_KINDS: AuthorityKind[] = [
  'revisado',
  'aprobado',
  'validado',
  'visto_bueno',
]

/** Autoridades según total de firmas (sin contar el jefe). */
const AUTHORITIES_BY_TOTAL: Record<3 | 4 | 5, AuthorityKind[]> = {
  3: ['revisado', 'validado'],
  4: ['revisado', 'aprobado', 'validado'],
  5: ['revisado', 'aprobado', 'visto_bueno', 'validado'],
}

export function fullSignerName(
  s: Pick<HospitalSigner, 'nombres' | 'apellidos'>,
): string {
  return `${s.nombres.trim()} ${s.apellidos.trim()}`.trim()
}

export function roleForSignerKind(kind: SignerKind): UserRole {
  switch (kind) {
    case 'elaborado':
      return 'lider_servicio'
    case 'revisado':
      return 'revisor'
    case 'aprobado':
      return 'direccion_asistencial'
    case 'visto_bueno':
      return 'subdireccion'
    case 'validado':
      return 'validador'
    default:
      return 'revisor'
  }
}

export function electronicSlotForKind(kind: SignerKind): FirmaEcSlot | null {
  switch (kind) {
    case 'elaborado':
      return 'jefe'
    case 'revisado':
    case 'aprobado':
      return 'revisor'
    case 'validado':
      return 'validador'
    default:
      return null
  }
}

function isAuthorityKind(k: string): k is AuthorityKind {
  return (AUTHORITY_KINDS as string[]).includes(k)
}

function emptyAuthority(order: number, kind: AuthorityKind): HospitalSigner {
  return {
    id: uid('sgn'),
    nombres: '',
    apellidos: '',
    cargo: AUTHORITY_KIND_DEFAULT_CARGO[kind],
    kind,
    email: '',
    order,
    active: true,
  }
}

export function defaultSignersConfig(count: 3 | 4 | 5 = 3): SignersConfig {
  const kinds = AUTHORITIES_BY_TOTAL[count]
  return {
    count,
    signers: kinds.map((kind, i) => emptyAuthority(i + 1, kind)),
  }
}

function normalizeList(
  list: HospitalSigner[],
  count: 3 | 4 | 5,
): HospitalSigner[] {
  const kinds = AUTHORITIES_BY_TOTAL[count]
  // Ignora entradas viejas de tipo "elaborado" (ahora es automático)
  const filtered = [...list]
    .filter((s) => s && isAuthorityKind(String(s.kind)))
    .sort((a, b) => a.order - b.order)
  const out: HospitalSigner[] = []
  for (let i = 0; i < kinds.length; i++) {
    const prev = filtered[i]
    const kind = prev?.kind && kinds.includes(prev.kind) ? prev.kind : kinds[i]
    out.push({
      id: prev?.id || uid('sgn'),
      nombres: prev?.nombres ?? '',
      apellidos: prev?.apellidos ?? '',
      cargo: (prev?.cargo || AUTHORITY_KIND_DEFAULT_CARGO[kind]).trim(),
      kind,
      email: prev?.email ?? '',
      linkedUserId: prev?.linkedUserId,
      order: i + 1,
      active: prev?.active !== false,
    })
  }
  return out
}

function readRaw(): SignersConfig | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SignersConfig>
    const count = ([3, 4, 5] as const).includes(parsed.count as 3 | 4 | 5)
      ? (parsed.count as 3 | 4 | 5)
      : 3
    const signers = Array.isArray(parsed.signers) ? parsed.signers : []
    return { count, signers: normalizeList(signers as HospitalSigner[], count) }
  } catch {
    return null
  }
}

export function getSignersConfig(): SignersConfig {
  return readRaw() ?? defaultSignersConfig(3)
}

export function saveSignersConfig(cfg: SignersConfig): SignersConfig {
  const next: SignersConfig = {
    count: cfg.count,
    signers: normalizeList(cfg.signers, cfg.count),
  }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function setSignersCount(count: 3 | 4 | 5): SignersConfig {
  const cur = getSignersConfig()
  const kinds = AUTHORITIES_BY_TOTAL[count]
  const prev = [...cur.signers]
    .filter((s) => isAuthorityKind(s.kind))
    .sort((a, b) => a.order - b.order)
  const signers = kinds.map((kind, i) => {
    const p = prev[i]
    if (p) {
      return {
        ...p,
        kind,
        cargo: p.cargo?.trim() || AUTHORITY_KIND_DEFAULT_CARGO[kind],
        order: i + 1,
        active: true,
      }
    }
    return emptyAuthority(i + 1, kind)
  })
  return saveSignersConfig({ count, signers })
}

export function updateSigner(
  id: string,
  patch: Partial<HospitalSigner>,
): SignersConfig {
  const cfg = getSignersConfig()
  const signers = cfg.signers.map((s) => {
    if (s.id !== id) return s
    const kind =
      patch.kind && isAuthorityKind(patch.kind) ? patch.kind : s.kind
    return {
      ...s,
      ...patch,
      id: s.id,
      order: s.order,
      kind,
      nombres: (patch.nombres ?? s.nombres).trim(),
      apellidos: (patch.apellidos ?? s.apellidos).trim(),
      cargo: (patch.cargo ?? s.cargo).trim(),
      email: (patch.email ?? s.email).trim().toLowerCase(),
    }
  })
  return saveSignersConfig({ ...cfg, signers })
}

/** Solo autoridades configuradas (sin el jefe). */
export function listActiveSigners(): HospitalSigner[] {
  return getSignersConfig()
    .signers.filter((s) => s.active !== false && isAuthorityKind(s.kind))
    .sort((a, b) => a.order - b.order)
}

export function authorityCount(cfg?: SignersConfig): number {
  const c = cfg ?? getSignersConfig()
  return Math.max(0, c.count - 1)
}

export function findSignerByUserId(userId: string): HospitalSigner | undefined {
  return listActiveSigners().find((s) => s.linkedUserId === userId)
}

export function findSignerByKind(
  kind: AuthorityKind,
): HospitalSigner | undefined {
  return listActiveSigners().find((s) => s.kind === kind)
}

export function cargoForSigningUser(
  userId: string,
  fallbackRoleLabel: string,
): string {
  const s = findSignerByUserId(userId)
  if (s?.cargo.trim()) return s.cargo.trim()
  return fallbackRoleLabel
}

export type PrintSignatureBox = {
  key: string
  label: string
  value: string
  designatedName?: string
  slot?: FirmaEcSlot
  kind: SignerKind
}

/**
 * Casillas de impresión: 1.ª = Jefe de servicio (automática) + autoridades.
 */
export function buildPrintSignatureBoxes(doc: ScheduleDoc): PrintSignatureBox[] {
  const jefeName =
    doc.elaboradoPor?.split('\n')[0]?.split('—')[0]?.trim() ||
    doc.jefeServicio.trim() ||
    ''

  const jefe: PrintSignatureBox = {
    key: 'jefe-auto',
    label: 'Jefe de servicio (Elaborado)',
    value: doc.elaboradoPor || doc.jefeServicio,
    designatedName: jefeName || undefined,
    slot: 'jefe',
    kind: 'elaborado',
  }

  const usedSlots = new Set<string>(['jefe'])
  const authorities: PrintSignatureBox[] = listActiveSigners().map((s) => {
    const slotCandidate = electronicSlotForKind(s.kind)
    const slot =
      slotCandidate && !usedSlots.has(slotCandidate)
        ? slotCandidate
        : undefined
    if (slot) usedSlots.add(slot)

    const stamp =
      s.kind === 'revisado'
        ? doc.revisadoPor || doc.aprobadoPor
        : s.kind === 'aprobado'
          ? doc.aprobadoPor || doc.revisadoPor
          : s.kind === 'validado'
            ? doc.talentoHumano
            : ''

    return {
      key: s.id,
      label: s.cargo || AUTHORITY_KIND_LABEL[s.kind],
      value: stamp,
      designatedName: fullSignerName(s) || undefined,
      slot: slot ?? undefined,
      kind: s.kind,
    }
  })

  return [jefe, ...authorities]
}

export function createOrUpdateUserFromSigner(
  signerId: string,
  password?: string,
): { signer: HospitalSigner; userId: string } {
  const cfg = getSignersConfig()
  const signer = cfg.signers.find((s) => s.id === signerId)
  if (!signer) throw new Error('Autoridad no encontrada')
  if (!signer.nombres.trim() || !signer.apellidos.trim()) {
    throw new Error('Indique nombres y apellidos de la autoridad')
  }
  if (!signer.cargo.trim()) {
    throw new Error('Indique la responsabilidad / cargo')
  }
  if (!signer.email.trim() || !signer.email.includes('@')) {
    throw new Error('Indique un correo válido para crear el usuario')
  }

  const role = roleForSignerKind(signer.kind)
  const existing = signer.linkedUserId
    ? getManagedUser(signer.linkedUserId)
    : undefined
  const name = fullSignerName(signer)

  const user = upsertManagedUser({
    id: existing?.id,
    name,
    email: signer.email.trim().toLowerCase(),
    role,
    serviceUnits: existing?.serviceUnits ?? [],
    password: password?.trim() || undefined,
    active: true,
  })

  const next = updateSigner(signer.id, { linkedUserId: user.id })
  const updated = next.signers.find((s) => s.id === signer.id)!
  return { signer: updated, userId: user.id }
}

export function resetSignersToDefaults(): SignersConfig {
  const next = defaultSignersConfig(3)
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}
