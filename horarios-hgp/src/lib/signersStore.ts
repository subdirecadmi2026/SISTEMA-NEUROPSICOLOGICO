import type { UserRole } from '../types'
import { uid } from '../types'
import { upsertManagedUser, getManagedUser } from './usersStore'
import type { FirmaEcSlot } from './firmaEc'

const KEY = 'hgp-hospital-signers-v1'

export type SignerKind =
  | 'elaborado'
  | 'revisado'
  | 'aprobado'
  | 'validado'
  | 'visto_bueno'

export type HospitalSigner = {
  id: string
  /** Nombres (uno o más). */
  nombres: string
  /** Apellidos (uno o más). */
  apellidos: string
  /** Responsabilidad / cargo que aparece en la casilla de firma. */
  cargo: string
  kind: SignerKind
  email: string
  /** Usuario del sistema vinculado (si se creó desde aquí). */
  linkedUserId?: string
  order: number
  active: boolean
}

export type SignersConfig = {
  /** Cantidad de casillas de firma en el horario (3–5). */
  count: 3 | 4 | 5
  signers: HospitalSigner[]
}

export const SIGNER_KIND_LABEL: Record<SignerKind, string> = {
  elaborado: 'Elaborado (Jefe de servicio)',
  revisado: 'Revisado',
  aprobado: 'Aprobado',
  validado: 'Validado (Talento Humano)',
  visto_bueno: 'Visto bueno',
}

export const SIGNER_KIND_DEFAULT_CARGO: Record<SignerKind, string> = {
  elaborado: 'Jefe de servicio',
  revisado: 'Revisor',
  aprobado: 'Director / Subdirector',
  validado: 'Talento Humano',
  visto_bueno: 'Visto bueno institucional',
}

const DEFAULT_KINDS_BY_COUNT: Record<3 | 4 | 5, SignerKind[]> = {
  3: ['elaborado', 'revisado', 'validado'],
  4: ['elaborado', 'revisado', 'aprobado', 'validado'],
  5: ['elaborado', 'revisado', 'aprobado', 'visto_bueno', 'validado'],
}

export function fullSignerName(s: Pick<HospitalSigner, 'nombres' | 'apellidos'>): string {
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

/** Slot electrónico del flujo (solo 3 pasos operativos). */
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

function emptySigner(order: number, kind: SignerKind): HospitalSigner {
  return {
    id: uid('sgn'),
    nombres: '',
    apellidos: '',
    cargo: SIGNER_KIND_DEFAULT_CARGO[kind],
    kind,
    email: '',
    order,
    active: true,
  }
}

export function defaultSignersConfig(count: 3 | 4 | 5 = 3): SignersConfig {
  const kinds = DEFAULT_KINDS_BY_COUNT[count]
  return {
    count,
    signers: kinds.map((kind, i) => emptySigner(i + 1, kind)),
  }
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
    return { count, signers: normalizeList(signers, count) }
  } catch {
    return null
  }
}

function normalizeList(
  list: HospitalSigner[],
  count: 3 | 4 | 5,
): HospitalSigner[] {
  const kinds = DEFAULT_KINDS_BY_COUNT[count]
  const byOrder = [...list].sort((a, b) => a.order - b.order)
  const out: HospitalSigner[] = []
  for (let i = 0; i < count; i++) {
    const prev = byOrder[i]
    const kind = prev?.kind && kinds.includes(prev.kind) ? prev.kind : kinds[i]
    out.push({
      id: prev?.id || uid('sgn'),
      nombres: prev?.nombres ?? '',
      apellidos: prev?.apellidos ?? '',
      cargo: (prev?.cargo || SIGNER_KIND_DEFAULT_CARGO[kind]).trim(),
      kind,
      email: prev?.email ?? '',
      linkedUserId: prev?.linkedUserId,
      order: i + 1,
      active: prev?.active !== false,
    })
  }
  return out
}

export function getSignersConfig(): SignersConfig {
  return readRaw() ?? defaultSignersConfig(3)
}

export function saveSignersConfig(cfg: SignersConfig): SignersConfig {
  const count = cfg.count
  const next: SignersConfig = {
    count,
    signers: normalizeList(cfg.signers, count),
  }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function setSignersCount(count: 3 | 4 | 5): SignersConfig {
  const cur = getSignersConfig()
  const kinds = DEFAULT_KINDS_BY_COUNT[count]
  const prev = [...cur.signers].sort((a, b) => a.order - b.order)
  const signers = kinds.map((kind, i) => {
    const p = prev[i]
    if (p) {
      return {
        ...p,
        kind,
        cargo: p.cargo?.trim() || SIGNER_KIND_DEFAULT_CARGO[kind],
        order: i + 1,
        active: true,
      }
    }
    return emptySigner(i + 1, kind)
  })
  return saveSignersConfig({ count, signers })
}

export function updateSigner(
  id: string,
  patch: Partial<HospitalSigner>,
): SignersConfig {
  const cfg = getSignersConfig()
  const signers = cfg.signers.map((s) =>
    s.id === id
      ? {
          ...s,
          ...patch,
          id: s.id,
          order: s.order,
          nombres: (patch.nombres ?? s.nombres).trim(),
          apellidos: (patch.apellidos ?? s.apellidos).trim(),
          cargo: (patch.cargo ?? s.cargo).trim(),
          email: (patch.email ?? s.email).trim().toLowerCase(),
        }
      : s,
  )
  return saveSignersConfig({ ...cfg, signers })
}

export function listActiveSigners(): HospitalSigner[] {
  return getSignersConfig()
    .signers.filter((s) => s.active !== false)
    .sort((a, b) => a.order - b.order)
}

export function findSignerByUserId(userId: string): HospitalSigner | undefined {
  return listActiveSigners().find((s) => s.linkedUserId === userId)
}

export function findSignerByKind(kind: SignerKind): HospitalSigner | undefined {
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

/**
 * Crea o actualiza el usuario del sistema a partir del responsable.
 * Email obligatorio; contraseña opcional (si se omite y el usuario es nuevo, se deja demo).
 */
export function createOrUpdateUserFromSigner(
  signerId: string,
  password?: string,
): { signer: HospitalSigner; userId: string } {
  const cfg = getSignersConfig()
  const signer = cfg.signers.find((s) => s.id === signerId)
  if (!signer) throw new Error('Responsable no encontrado')
  const name = fullSignerName(signer)
  if (!signer.nombres.trim() || !signer.apellidos.trim()) {
    throw new Error('Indique nombres y apellidos del responsable')
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
