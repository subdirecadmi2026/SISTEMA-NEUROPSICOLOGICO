import type { ScheduleDoc, UserRole } from '../types'
import { uid } from '../types'
import { upsertManagedUser, getManagedUser } from './usersStore'
import type { FirmaEcSlot } from './firmaEc'

const KEY = 'hgp-hospital-signers-v1'

/**
 * Autoridades que respaldan / validan el horario.
 * La 1.ª firma (Jefe de servicio · Elaborado) NO se configura aquí.
 */
export type AuthorityKind =
  | 'direccion_asistencial'
  | 'direccion_medica'
  | 'gerencia'
  | 'talento_humano'

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
   * Total de casillas (incluye el jefe).
   * 3 = jefe + 2 autoridades; 4 = jefe + 3; 5 = jefe + 4.
   */
  count: 3 | 4 | 5
  signers: HospitalSigner[]
}

export const AUTHORITY_KIND_LABEL: Record<AuthorityKind, string> = {
  direccion_asistencial: 'Dirección Asistencial',
  direccion_medica: 'Dirección Médica',
  gerencia: 'Gerencia',
  talento_humano: 'Talento Humano',
}

export const AUTHORITY_KIND_DEFAULT_CARGO: Record<AuthorityKind, string> = {
  direccion_asistencial: 'Dirección Asistencial',
  direccion_medica: 'Dirección Médica',
  gerencia: 'Gerencia',
  talento_humano: 'Talento Humano',
}

export const SIGNER_KIND_LABEL: Record<SignerKind, string> = {
  elaborado: 'Jefe de servicio (automático)',
  ...AUTHORITY_KIND_LABEL,
}

export const SIGNER_KIND_DEFAULT_CARGO: Record<SignerKind, string> = {
  elaborado: 'Jefe de servicio',
  ...AUTHORITY_KIND_DEFAULT_CARGO,
}

const AUTHORITY_KINDS: AuthorityKind[] = [
  'direccion_asistencial',
  'direccion_medica',
  'gerencia',
  'talento_humano',
]

const AUTHORITIES_BY_TOTAL: Record<3 | 4 | 5, AuthorityKind[]> = {
  3: ['direccion_asistencial', 'talento_humano'],
  4: ['direccion_asistencial', 'direccion_medica', 'talento_humano'],
  5: [
    'direccion_asistencial',
    'direccion_medica',
    'gerencia',
    'talento_humano',
  ],
}

/** Migra tipos antiguos de localStorage. */
function migrateAuthorityKind(raw: string): AuthorityKind | null {
  if ((AUTHORITY_KINDS as string[]).includes(raw)) return raw as AuthorityKind
  switch (raw) {
    case 'revisado':
      return 'direccion_asistencial'
    case 'aprobado':
      return 'direccion_medica'
    case 'visto_bueno':
      return 'gerencia'
    case 'validado':
      return 'talento_humano'
    default:
      return null
  }
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
    case 'direccion_asistencial':
      return 'direccion_asistencial'
    case 'direccion_medica':
      return 'subdireccion'
    case 'gerencia':
      return 'revisor'
    case 'talento_humano':
      return 'validador'
    default:
      return 'revisor'
  }
}

export function electronicSlotForKind(kind: SignerKind): FirmaEcSlot | null {
  switch (kind) {
    case 'elaborado':
      return 'jefe'
    case 'direccion_asistencial':
    case 'direccion_medica':
    case 'gerencia':
      return 'revisor'
    case 'talento_humano':
      return 'validador'
    default:
      return null
  }
}

function isAuthorityKind(k: string): boolean {
  return migrateAuthorityKind(k) != null
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
  const filtered = [...list]
    .map((s) => {
      if (!s) return null
      const kind = migrateAuthorityKind(String(s.kind))
      if (!kind) return null
      return { ...s, kind }
    })
    .filter((s): s is HospitalSigner => !!s)
    .sort((a, b) => a.order - b.order)

  const out: HospitalSigner[] = []
  for (let i = 0; i < kinds.length; i++) {
    const prev = filtered[i]
    const kind =
      prev?.kind && kinds.includes(prev.kind) ? prev.kind : kinds[i]
    const defaultCargo = AUTHORITY_KIND_DEFAULT_CARGO[kind]
    const prevCargo = (prev?.cargo ?? '').trim()
    // Si el cargo era el default del tipo viejo, usa el nuevo default
    const cargo =
      prevCargo &&
      prevCargo !== 'Revisor' &&
      prevCargo !== 'Director / Subdirector' &&
      prevCargo !== 'Visto bueno institucional' &&
      prevCargo !== 'Valida (Talento Humano)'
        ? prevCargo
        : defaultCargo
    out.push({
      id: prev?.id || uid('sgn'),
      nombres: prev?.nombres ?? '',
      apellidos: prev?.apellidos ?? '',
      cargo,
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
    const kindRaw = patch.kind ? migrateAuthorityKind(patch.kind) : s.kind
    const kind = kindRaw ?? s.kind
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
      s.kind === 'talento_humano'
        ? doc.talentoHumano
        : doc.revisadoPor || doc.aprobadoPor

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
