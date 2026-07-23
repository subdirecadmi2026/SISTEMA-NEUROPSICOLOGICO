import type {
  ApprovalSignature,
  AppUser,
  ElectronicSignRecord,
  ReviewComment,
  ScheduleDoc,
  ScheduleStatus,
  UserRole,
} from '../types'
import { ROLE_LABEL, uid } from '../types'
import { canEditSchedule } from './validation'

const USER_KEY = 'hgp-auth-user-v1'

/** Usuarios demo del flujo HGP: Jefe → Revisor → Validador. */
export const DEMO_USERS: AppUser[] = [
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
  // Legado / institucionales (siguen funcionando)
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

/** Jefe de servicio: crea y edita horarios en borrador. */
export function isJefeRole(role: UserRole): boolean {
  return role === 'lider_servicio' || role === 'admin'
}

/** Revisor: solo visualiza; puede aprobar o pedir corrección. */
export function isRevisorRole(role: UserRole): boolean {
  return (
    role === 'revisor' ||
    role === 'direccion_asistencial' ||
    role === 'subdireccion' ||
    role === 'gestion_enfermeria' ||
    role === 'admin'
  )
}

/** Validador: valida formalmente un horario ya aprobado. */
export function isValidadorRole(role: UserRole): boolean {
  return role === 'validador' || role === 'talento_humano' || role === 'admin'
}

export function loadSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    const user = JSON.parse(raw) as AppUser
    // Migrar id antiguo si el usuario ya no existe en DEMO_USERS
    const stillValid = DEMO_USERS.some((u) => u.id === user.id)
    if (!stillValid && user.role) return user
    const fresh = DEMO_USERS.find((u) => u.id === user.id)
    return fresh ?? user
  } catch {
    return null
  }
}

export function loginAs(user: AppUser): AppUser {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  return user
}

export function loginByEmail(email: string): AppUser | null {
  const found = DEMO_USERS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
  )
  if (!found) return null
  return loginAs(found)
}

/** Contraseña demo compartida (entorno de prueba HGP). */
export const DEMO_PASSWORD = 'hgp2026'

/** Perfiles principales del flujo (login destacado). */
export const PRIMARY_DEMO_IDS = [
  'u-jefe',
  'u-revisor',
  'u-validador',
  'u-admin',
] as const

export function primaryDemoUsers(): AppUser[] {
  return PRIMARY_DEMO_IDS.map((id) =>
    DEMO_USERS.find((u) => u.id === id),
  ).filter((u): u is AppUser => !!u)
}

export function otherDemoUsers(): AppUser[] {
  return DEMO_USERS.filter(
    (u) => !(PRIMARY_DEMO_IDS as readonly string[]).includes(u.id),
  )
}

/**
 * Login por correo + contraseña demo.
 * Acepta DEMO_PASSWORD o dejar contraseña vacía solo en acceso rápido por tarjeta.
 */
export function authenticateDemo(
  email: string,
  password: string,
): { ok: true; user: AppUser } | { ok: false; error: string } {
  const found = DEMO_USERS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
  )
  if (!found) {
    return { ok: false, error: 'No existe un perfil con ese correo' }
  }
  if (password !== DEMO_PASSWORD) {
    return {
      ok: false,
      error: `Contraseña incorrecta. En demo use: ${DEMO_PASSWORD}`,
    }
  }
  return { ok: true, user: loginAs(found) }
}

export function logout() {
  localStorage.removeItem(USER_KEY)
}

export function roleLabel(role: UserRole): string {
  return ROLE_LABEL[role]
}

/** Qué hace cada rol en el flujo (texto corto para login / perfil). */
export function roleMission(role: UserRole): string {
  switch (role) {
    case 'lider_servicio':
      return 'Elabora el horario del servicio, firma y lo envía a revisión.'
    case 'revisor':
    case 'direccion_asistencial':
    case 'subdireccion':
    case 'gestion_enfermeria':
      return 'Revisa en solo lectura: aprueba o devuelve con comentario.'
    case 'validador':
    case 'talento_humano':
      return 'Valida horarios aprobados, firma con QR y archiva el PDF.'
    case 'admin':
      return 'Acceso completo a elaboración, revisión y validación.'
    default:
      return ROLE_LABEL[role]
  }
}

export function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function appendAudit(
  doc: ScheduleDoc,
  user: AppUser | null,
  action: string,
  detail?: string,
): ScheduleDoc {
  return {
    ...doc,
    version: doc.version + 1,
    updatedAt: new Date().toISOString(),
    audit: [
      ...doc.audit,
      {
        id: uid('aud'),
        at: new Date().toISOString(),
        userId: user?.id,
        userName: user?.name ?? 'Anónimo',
        action,
        detail,
      },
    ],
  }
}

export function addReviewComment(
  doc: ScheduleDoc,
  user: AppUser,
  message: string,
): ScheduleDoc {
  const comment: ReviewComment = {
    id: uid('rc'),
    at: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    role: user.role,
    message: message.trim(),
    resolved: false,
  }
  return appendAudit(
    {
      ...doc,
      reviewComments: [...(doc.reviewComments ?? []), comment],
    },
    user,
    'comentario_correccion',
    comment.message.slice(0, 120),
  )
}

export function resolveReviewComments(
  doc: ScheduleDoc,
  user: AppUser | null,
): ScheduleDoc {
  const comments = doc.reviewComments ?? []
  if (comments.length === 0) return doc
  const next: ScheduleDoc = {
    ...doc,
    reviewComments: comments.map((c) =>
      c.resolved ? c : { ...c, resolved: true },
    ),
  }
  return appendAudit(next, user, 'correcciones_atendidas')
}

export function transitionStatus(
  doc: ScheduleDoc,
  next: ScheduleStatus,
  user: AppUser,
  opts?: {
    cargo?: string
    comment?: string
    signedName?: string
    electronic?: ElectronicSignRecord
  },
): { ok: true; doc: ScheduleDoc } | { ok: false; error: string } {
  const allowed: Record<ScheduleStatus, ScheduleStatus[]> = {
    BORRADOR: ['EN_REVISION'],
    EN_REVISION: ['BORRADOR', 'APROBADO'],
    APROBADO: ['ARCHIVADO', 'BORRADOR'],
    ARCHIVADO: ['BORRADOR'],
  }
  if (!allowed[doc.status].includes(next)) {
    return {
      ok: false,
      error: `No se puede pasar de ${doc.status} a ${next}`,
    }
  }

  // Jefe envía a revisión
  if (next === 'EN_REVISION' && !isJefeRole(user.role)) {
    return {
      ok: false,
      error: 'Solo el jefe de servicio (o admin) envía a revisión',
    }
  }

  // Revisor aprueba o devuelve con comentario
  if (doc.status === 'EN_REVISION' && next === 'APROBADO' && !isRevisorRole(user.role)) {
    return { ok: false, error: 'Solo el revisor puede aprobar' }
  }
  if (doc.status === 'EN_REVISION' && next === 'BORRADOR') {
    if (!isRevisorRole(user.role)) {
      return { ok: false, error: 'Solo el revisor puede devolver a borrador' }
    }
    if (!opts?.comment?.trim()) {
      return {
        ok: false,
        error: 'Indique un comentario de corrección al devolver',
      }
    }
  }

  // Validador valida (archiva)
  if (doc.status === 'APROBADO' && next === 'ARCHIVADO' && !isValidadorRole(user.role)) {
    return { ok: false, error: 'Solo el validador puede validar el horario' }
  }

  // Reabrir aprobado/archivado → solo admin
  if (
    next === 'BORRADOR' &&
    (doc.status === 'APROBADO' || doc.status === 'ARCHIVADO') &&
    user.role !== 'admin'
  ) {
    return { ok: false, error: 'Solo admin puede reabrir un horario cerrado' }
  }

  const sigRole: ApprovalSignature['role'] =
    next === 'EN_REVISION'
      ? 'elaborado'
      : next === 'APROBADO'
        ? 'aprobado'
        : next === 'ARCHIVADO'
          ? 'validado'
          : 'revisado'

  const signedName = (
    opts?.electronic?.subjectCn ||
    opts?.signedName?.trim() ||
    user.name
  ).trim()
  const stampText = opts?.electronic?.stampText
  const signature: ApprovalSignature = {
    role: sigRole,
    name: signedName,
    cargo: opts?.cargo ?? roleLabel(user.role),
    at: opts?.electronic?.signedAt ?? new Date().toISOString(),
    userId: user.id,
    electronic: !!opts?.electronic,
    subjectCn: opts?.electronic?.subjectCn,
    certSerial: opts?.electronic?.serialNumber,
  }

  let updated: ScheduleDoc = {
    ...doc,
    status: next,
    signatures: [...doc.signatures, signature],
    reviewComments: doc.reviewComments ?? [],
    electronicSigns: [...(doc.electronicSigns ?? [])],
  }

  if (opts?.electronic) {
    // Reemplaza firma electrónica previa del mismo slot
    updated.electronicSigns = [
      ...(updated.electronicSigns ?? []).filter(
        (e) => e.slot !== opts.electronic!.slot,
      ),
      opts.electronic,
    ]
  }

  if (next === 'EN_REVISION') {
    updated = {
      ...updated,
      elaboradoPor: stampText ?? `${signedName} — ${signature.cargo}`,
    }
    // Al reenviar, marcar correcciones previas como atendidas
    if ((updated.reviewComments ?? []).some((c) => !c.resolved)) {
      updated = {
        ...updated,
        reviewComments: (updated.reviewComments ?? []).map((c) => ({
          ...c,
          resolved: true,
        })),
      }
    }
  }

  if (next === 'APROBADO') {
    const text = stampText ?? `${signedName} — ${signature.cargo}`
    updated = {
      ...updated,
      aprobadoPor: text,
      revisadoPor: text,
    }
  }

  if (next === 'ARCHIVADO') {
    updated = {
      ...updated,
      talentoHumano: stampText ?? `${signedName} — ${signature.cargo}`,
    }
  }

  // Devolver con comentario de corrección
  if (doc.status === 'EN_REVISION' && next === 'BORRADOR' && opts?.comment?.trim()) {
    const comment: ReviewComment = {
      id: uid('rc'),
      at: new Date().toISOString(),
      userId: user.id,
      userName: user.name,
      role: user.role,
      message: opts.comment.trim(),
      resolved: false,
    }
    updated = {
      ...updated,
      reviewComments: [...(updated.reviewComments ?? []), comment],
    }
  }

  const detail =
    doc.status === 'EN_REVISION' && next === 'BORRADOR' && opts?.comment
      ? `Corrección: ${opts.comment.trim().slice(0, 120)}`
      : `Firma: ${signature.name}`

  updated = appendAudit(updated, user, `estado_${next}`, detail)
  return { ok: true, doc: updated }
}

export function assertEditable(
  doc: ScheduleDoc,
  user: AppUser | null,
): boolean {
  return canEditSchedule(doc.status, user?.role ?? null)
}
