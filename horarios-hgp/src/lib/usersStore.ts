import type { AppUser, UserRole } from '../types'
import { uid } from '../types'

const USERS_KEY = 'hgp-users-v1'
const DELETED_DEMO_KEY = 'hgp-users-deleted-demo-v1'

/** Usuario gestionable (demo o creado por admin). */
export type ManagedUser = AppUser & {
  /** Si falta, en login demo se usa DEMO_PASSWORD. */
  password?: string
  active: boolean
  source: 'demo' | 'custom'
  createdAt: string
  updatedAt: string
}

type UsersBlob = {
  custom: ManagedUser[]
  /** Overrides de usuarios demo (mismo id). */
  overrides: Record<string, Partial<ManagedUser>>
}

export const SEED_USERS: AppUser[] = [
  {
    id: 'u-jefe',
    email: 'jefe.servicio@hgp.gob.ec',
    name: 'Dr. Carlos Mendoza',
    role: 'lider_servicio',
    serviceUnits: ['Medicina interna', 'Centro Obstétrico', 'Pediatría'],
  },
  {
    id: 'u-revisor',
    email: 'revisor@hgp.gob.ec',
    name: 'Dra. María Solís',
    role: 'revisor',
    serviceUnits: [],
  },
  {
    id: 'u-validador',
    email: 'validador@hgp.gob.ec',
    name: 'Ing. Patricia Vega',
    role: 'validador',
    serviceUnits: [],
  },
  {
    id: 'u-admin',
    email: 'admin@hgp.gob.ec',
    name: 'Administrador HGP',
    role: 'admin',
    serviceUnits: [],
  },
  {
    id: 'u-lider',
    email: 'lider.obstetrico@hgp.gob.ec',
    name: 'Lic. Ana Parra',
    role: 'lider_servicio',
    serviceUnits: ['Centro Obstétrico', 'Medicina interna'],
  },
  {
    id: 'u-gestion',
    email: 'gestion.enfermeria@hgp.gob.ec',
    name: 'Lic. Irma Naveda',
    role: 'gestion_enfermeria',
    serviceUnits: [],
  },
  {
    id: 'u-dir',
    email: 'direccion.asistencial@hgp.gob.ec',
    name: 'Dr. Santiago Pacheco',
    role: 'direccion_asistencial',
    serviceUnits: [],
  },
  {
    id: 'u-sub',
    email: 'subdireccion@hgp.gob.ec',
    name: 'Mgs. Alex Naranjo',
    role: 'subdireccion',
    serviceUnits: [],
  },
  {
    id: 'u-th',
    email: 'talento.humano@hgp.gob.ec',
    name: 'Ing. Lourdes Yánez',
    role: 'talento_humano',
    serviceUnits: [],
  },
]

function emptyBlob(): UsersBlob {
  return { custom: [], overrides: {} }
}

function readBlob(): UsersBlob {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) return emptyBlob()
    const parsed = JSON.parse(raw) as UsersBlob
    return {
      custom: Array.isArray(parsed.custom) ? parsed.custom : [],
      overrides: parsed.overrides ?? {},
    }
  } catch {
    return emptyBlob()
  }
}

function writeBlob(blob: UsersBlob) {
  localStorage.setItem(USERS_KEY, JSON.stringify(blob))
}

function readDeletedDemo(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_DEMO_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function writeDeletedDemo(ids: Set<string>) {
  localStorage.setItem(DELETED_DEMO_KEY, JSON.stringify([...ids]))
}

/** Perfiles del login (jefe, revisor, validador, admin) no deben desaparecer. */
export const PRIMARY_LOGIN_IDS = [
  'u-jefe',
  'u-revisor',
  'u-validador',
  'u-admin',
] as const

/**
 * Si se eliminaron por error, se restauran al abrir el acceso.
 */
export function ensurePrimaryLoginUsers(): void {
  const deleted = readDeletedDemo()
  let changed = false
  for (const id of PRIMARY_LOGIN_IDS) {
    if (deleted.has(id)) {
      deleted.delete(id)
      changed = true
    }
  }
  if (changed) writeDeletedDemo(deleted)

  const blob = readBlob()
  let overrideChanged = false
  for (const id of PRIMARY_LOGIN_IDS) {
    const ov = blob.overrides[id]
    if (ov && ov.active === false) {
      blob.overrides[id] = { ...ov, active: true }
      overrideChanged = true
    }
  }
  if (overrideChanged) writeBlob(blob)
}

function asManaged(seed: AppUser, override?: Partial<ManagedUser>): ManagedUser {
  const now = new Date().toISOString()
  return {
    ...seed,
    ...override,
    id: seed.id,
    active: override?.active !== false,
    source: 'demo',
    createdAt: override?.createdAt ?? now,
    updatedAt: override?.updatedAt ?? now,
    password: override?.password,
  }
}

/** Lista completa (demo + personalizados), sin eliminados. */
export function listManagedUsers(): ManagedUser[] {
  const blob = readBlob()
  const deleted = readDeletedDemo()
  const demo = SEED_USERS.filter((u) => !deleted.has(u.id)).map((u) =>
    asManaged(u, blob.overrides[u.id]),
  )
  const custom = blob.custom.filter((u) => u.active !== false)
  return [...demo, ...custom].sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export function listAppUsers(): AppUser[] {
  return listManagedUsers()
    .filter((u) => u.active !== false)
    .map(({ id, email, name, role, serviceUnits }) => ({
      id,
      email,
      name,
      role,
      serviceUnits,
    }))
}

export function getManagedUser(id: string): ManagedUser | null {
  return listManagedUsers().find((u) => u.id === id) ?? null
}

export function findUserByEmail(email: string): ManagedUser | null {
  const needle = email.trim().toLowerCase()
  return (
    listManagedUsers().find((u) => u.email.toLowerCase() === needle) ?? null
  )
}

export type UserInput = {
  id?: string
  email: string
  name: string
  role: UserRole
  serviceUnits: string[]
  password?: string
  active?: boolean
}

export function upsertManagedUser(input: UserInput): ManagedUser {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  if (!email || !name) throw new Error('Nombre y correo son obligatorios')

  const blob = readBlob()
  const now = new Date().toISOString()
  const existing = input.id ? getManagedUser(input.id) : null
  const clash = findUserByEmail(email)
  if (clash && clash.id !== existing?.id) {
    throw new Error('Ya existe un usuario con ese correo')
  }

  if (existing?.source === 'demo') {
    blob.overrides[existing.id] = {
      ...blob.overrides[existing.id],
      email,
      name,
      role: input.role,
      serviceUnits: [...input.serviceUnits],
      password: input.password?.trim() || blob.overrides[existing.id]?.password,
      active: input.active !== false,
      updatedAt: now,
      createdAt: existing.createdAt,
      source: 'demo',
      id: existing.id,
    }
    writeBlob(blob)
    return getManagedUser(existing.id)!
  }

  if (existing?.source === 'custom') {
    const next: ManagedUser = {
      ...existing,
      email,
      name,
      role: input.role,
      serviceUnits: [...input.serviceUnits],
      password: input.password?.trim() || existing.password,
      active: input.active !== false,
      updatedAt: now,
    }
    blob.custom = blob.custom.map((u) => (u.id === next.id ? next : u))
    writeBlob(blob)
    return next
  }

  const created: ManagedUser = {
    id: input.id?.trim() || uid('usr'),
    email,
    name,
    role: input.role,
    serviceUnits: [...input.serviceUnits],
    password: input.password?.trim() || undefined,
    active: input.active !== false,
    source: 'custom',
    createdAt: now,
    updatedAt: now,
  }
  blob.custom.push(created)
  writeBlob(blob)
  return created
}

export function deleteManagedUser(id: string): void {
  const user = getManagedUser(id)
  if (!user) return

  if ((PRIMARY_LOGIN_IDS as readonly string[]).includes(id)) {
    throw new Error(
      'No se puede eliminar el perfil de login (Jefe, Revisor, Validador o Administrador). Desactívelo solo si es otro usuario.',
    )
  }

  const admins = listManagedUsers().filter(
    (u) => u.role === 'admin' && u.active !== false && u.id !== id,
  )
  if (user.role === 'admin' && admins.length === 0) {
    throw new Error('No puede eliminar el último administrador')
  }

  if (user.source === 'demo') {
    const deleted = readDeletedDemo()
    deleted.add(id)
    writeDeletedDemo(deleted)
    const blob = readBlob()
    delete blob.overrides[id]
    writeBlob(blob)
    return
  }

  const blob = readBlob()
  blob.custom = blob.custom.filter((u) => u.id !== id)
  writeBlob(blob)
}

export function restoreDemoUsers(): void {
  localStorage.removeItem(DELETED_DEMO_KEY)
  const blob = readBlob()
  blob.overrides = {}
  writeBlob(blob)
}

export function checkUserPassword(
  user: ManagedUser,
  password: string,
  demoFallback: string,
): boolean {
  if (user.password) return user.password === password
  return password === demoFallback
}

export const ALL_ROLES: UserRole[] = [
  'lider_servicio',
  'revisor',
  'validador',
  'admin',
  'gestion_enfermeria',
  'subdireccion',
  'direccion_asistencial',
  'talento_humano',
]
