import type { ScheduleDoc, UserRole } from '../types'
import { uid } from '../types'
import { upsertManagedUser, getManagedUser } from './usersStore'
import type { FirmaEcSlot } from './firmaEc'

const KEY = 'hgp-hospital-signers-v1'

/** Máximo de autoridades además del jefe (impresión A4). */
export const MAX_AUTHORITIES = 6

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
   * Se deriva de 1 + autoridades; se guarda por compatibilidad.
   */
  count: number
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

/** Plantillas rápidas (atajos), no obligatorias. */
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

function sanitizeCargo(cargo: string, kind: AuthorityKind): string {
  const legacy = cargo.trim()
  if (
    legacy === 'Revisor' ||
    legacy === 'Director / Subdirector' ||
    legacy === 'Visto bueno institucional' ||
    legacy === 'Valida (Talento Humano)'
  ) {
    return AUTHORITY_KIND_DEFAULT_CARGO[kind]
  }
  // Vacío real → default; espacios al escribir se conservan.
  if (cargo === '') return AUTHORITY_KIND_DEFAULT_CARGO[kind]
  return cargo
}

/** Conserva la lista tal cual (CRUD libre); solo migra tipos y reordena. */
function normalizeList(list: HospitalSigner[]): HospitalSigner[] {
  const cleaned: HospitalSigner[] = []
  for (const s of list) {
    if (!s) continue
    const kind = migrateAuthorityKind(String(s.kind))
    if (!kind) continue
    // No hacer .trim() en nombres/apellidos/cargo aquí: al editar en vivo
    // el trim borra el espacio y no deja separar palabras (ej. "María ").
    cleaned.push({
      id: s.id || uid('sgn'),
      nombres: String(s.nombres ?? ''),
      apellidos: String(s.apellidos ?? ''),
      cargo: sanitizeCargo(String(s.cargo ?? ''), kind),
      kind,
      email: String(s.email ?? '')
        .trim()
        .toLowerCase(),
      linkedUserId: s.linkedUserId,
      order: Number(s.order) || 0,
      active: s.active !== false,
    })
  }
  return cleaned
    .sort((a, b) => a.order - b.order)
    .slice(0, MAX_AUTHORITIES)
    .map((s, i) => ({ ...s, order: i + 1 }))
}

function totalCount(authorities: number): number {
  return 1 + Math.max(0, Math.min(MAX_AUTHORITIES, authorities))
}

export function defaultSignersConfig(preset: 3 | 4 | 5 = 3): SignersConfig {
  const kinds = AUTHORITIES_BY_TOTAL[preset]
  const signers = kinds.map((kind, i) => emptyAuthority(i + 1, kind))
  return { count: totalCount(signers.length), signers }
}

function readRaw(): SignersConfig | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SignersConfig>
    const signers = normalizeList(
      Array.isArray(parsed.signers) ? (parsed.signers as HospitalSigner[]) : [],
    )
    return { count: totalCount(signers.length), signers }
  } catch {
    return null
  }
}

export function getSignersConfig(): SignersConfig {
  return readRaw() ?? defaultSignersConfig(3)
}

export function saveSignersConfig(cfg: SignersConfig): SignersConfig {
  const signers = normalizeList(cfg.signers)
  const next: SignersConfig = {
    count: totalCount(signers.length),
    signers,
  }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

/** Atajo: plantilla de 3 / 4 / 5 firmas totales (jefe + autoridades). */
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
        cargo: sanitizeCargo(p.cargo ?? '', kind),
        order: i + 1,
        active: true,
      }
    }
    return emptyAuthority(i + 1, kind)
  })
  return saveSignersConfig({ count, signers })
}

export function addAuthority(
  kind: AuthorityKind = 'direccion_asistencial',
): SignersConfig {
  const cfg = getSignersConfig()
  if (cfg.signers.length >= MAX_AUTHORITIES) {
    throw new Error(
      `Máximo ${MAX_AUTHORITIES} autoridades además del jefe de servicio`,
    )
  }
  const order = cfg.signers.length + 1
  const signers = [...cfg.signers, emptyAuthority(order, kind)]
  return saveSignersConfig({ ...cfg, signers })
}

export function removeAuthority(id: string): SignersConfig {
  const cfg = getSignersConfig()
  const signers = cfg.signers.filter((s) => s.id !== id)
  return saveSignersConfig({ ...cfg, signers })
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
      // Sin trim en nombres/apellidos/cargo: permite espacios al escribir.
      nombres: patch.nombres ?? s.nombres,
      apellidos: patch.apellidos ?? s.apellidos,
      cargo: patch.cargo ?? s.cargo,
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
  return c.signers.filter((s) => s.active !== false).length
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
