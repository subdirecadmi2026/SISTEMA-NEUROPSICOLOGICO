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
import {
  SEED_USERS,
  checkUserPassword,
  ensurePrimaryLoginUsers,
  findUserByEmail,
  getManagedUser,
  listAppUsers,
} from './usersStore'
import { cargoForSigningUser } from './signersStore'

const USER_KEY = 'hgp-auth-user-v1'

/** Usuarios visibles (demo + creados por admin). */
export function getDemoUsers(): AppUser[] {
  return listAppUsers()
}

/** Semilla estática (compatibilidad tests / imports). Prefer getDemoUsers(). */
export const DEMO_USERS: AppUser[] = SEED_USERS

/** Jefe de servicio: crea y edita horarios en borrador. */
export function isJefeRole(role: UserRole): boolean {
  return role === 'lider_servicio' || role === 'admin'
}

/** Admisiones: visualiza y da visto bueno junto al revisor. */
export function isAdmisionesRole(role: UserRole): boolean {
  return role === 'admisiones' || role === 'admin'
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

export function hasAdmisionesApproval(doc: ScheduleDoc): boolean {
  if (doc.admisionesApprovedAt) return true
  if (doc.admisionesPor?.trim()) return true
  return (doc.electronicSigns ?? []).some((e) => e.slot === 'admisiones')
}

export function hasRevisorApproval(doc: ScheduleDoc): boolean {
  if (doc.revisorApprovedAt) return true
  if (doc.status === 'APROBADO' || doc.status === 'ARCHIVADO') {
    return !!doc.revisadoPor?.trim() || !!doc.aprobadoPor?.trim()
  }
  return (
    !!doc.revisadoPor?.trim() ||
    (doc.electronicSigns ?? []).some((e) => e.slot === 'revisor')
  )
}

export function loadSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    const user = JSON.parse(raw) as AppUser
    const fresh = getManagedUser(user.id)
    if (fresh && fresh.active !== false) {
      return {
        id: fresh.id,
        email: fresh.email,
        name: fresh.name,
        role: fresh.role,
        serviceUnits: fresh.serviceUnits,
      }
    }
    if (!fresh) return null
    return user
  } catch {
    return null
  }
}

export function loginAs(user: AppUser): AppUser {
  const slim: AppUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    serviceUnits: user.serviceUnits,
  }
  localStorage.setItem(USER_KEY, JSON.stringify(slim))
  return slim
}

export function loginByEmail(email: string): AppUser | null {
  const found = findUserByEmail(email)
  if (!found || found.active === false) return null
  return loginAs(found)
}

/** Contraseña demo compartida (entorno de prueba HGP). */
export const DEMO_PASSWORD = 'hgp2026'

/** Perfiles principales del flujo (login destacado). */
export const PRIMARY_DEMO_IDS = [
  'u-jefe',
  'u-admisiones',
  'u-revisor',
  'u-validador',
  'u-admin',
] as const

export function primaryDemoUsers(): AppUser[] {
  ensurePrimaryLoginUsers()
  const all = listAppUsers()
  return PRIMARY_DEMO_IDS.map((id) => {
    const found = all.find((u) => u.id === id)
    if (found) return found
    const seed = SEED_USERS.find((u) => u.id === id)
    return seed ?? null
  }).filter((u): u is AppUser => !!u)
}

export function otherDemoUsers(): AppUser[] {
  return listAppUsers().filter(
    (u) => !(PRIMARY_DEMO_IDS as readonly string[]).includes(u.id),
  )
}

/**
 * Login por correo + contraseña (demo o personalizada del usuario).
 * Si se indica `expectedUserId`, el correo debe corresponder a ese perfil.
 */
export function authenticateDemo(
  email: string,
  password: string,
  opts?: { expectedUserId?: string; expectedRole?: UserRole },
): { ok: true; user: AppUser } | { ok: false; error: string } {
  const found = findUserByEmail(email)
  if (!found || found.active === false) {
    return { ok: false, error: 'Usuario o correo no registrado' }
  }
  if (opts?.expectedUserId && found.id !== opts.expectedUserId) {
    return {
      ok: false,
      error: 'El usuario no corresponde al perfil que seleccionó',
    }
  }
  if (opts?.expectedRole && found.role !== opts.expectedRole) {
    return {
      ok: false,
      error: 'El usuario no corresponde al rol seleccionado',
    }
  }
  if (!password.trim()) {
    return { ok: false, error: 'Ingrese la contraseña' }
  }
  if (!checkUserPassword(found, password, DEMO_PASSWORD)) {
    return {
      ok: false,
      error: found.password
        ? 'Contraseña incorrecta'
        : `Contraseña incorrecta. En demo use: ${DEMO_PASSWORD}`,
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
      return 'Elabora el horario completo y lo envía a Admisiones y Revisor.'
    case 'admisiones':
      return 'Visualiza horarios en revisión y da el visto bueno de Admisiones (junto al revisor).'
    case 'revisor':
    case 'direccion_asistencial':
    case 'subdireccion':
    case 'gestion_enfermeria':
      return 'Revisa en solo lectura: aprueba o devuelve con comentario (junto a Admisiones).'
    case 'validador':
    case 'talento_humano':
      return 'Talento Humano: valida horarios ya aprobados por Admisiones y Revisor, archiva PDF.'
    case 'admin':
      return 'Administra usuarios, servicios, personal, permisos y horarios.'
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
    /** Quién está dando el visto bueno en EN_REVISION → APROBADO. */
    approvalAs?: 'admisiones' | 'revisor'
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

  // Admisiones o Revisor dan visto bueno (ambos requeridos para APROBADO)
  if (doc.status === 'EN_REVISION' && next === 'APROBADO') {
    const as =
      opts?.approvalAs ??
      (user.role === 'admisiones'
        ? 'admisiones'
        : isRevisorRole(user.role)
          ? 'revisor'
          : isAdmisionesRole(user.role)
            ? 'admisiones'
            : null)
    if (as === 'admisiones' && !isAdmisionesRole(user.role)) {
      return { ok: false, error: 'Solo Admisiones puede dar este visto bueno' }
    }
    if (as === 'revisor' && !isRevisorRole(user.role)) {
      return { ok: false, error: 'Solo el revisor puede aprobar' }
    }
    if (!as) {
      return {
        ok: false,
        error: 'Solo Admisiones o el revisor pueden aprobar',
      }
    }
  }
  if (doc.status === 'EN_REVISION' && next === 'BORRADOR') {
    if (!isRevisorRole(user.role) && !isAdmisionesRole(user.role)) {
      return {
        ok: false,
        error: 'Solo Admisiones o el revisor pueden devolver a borrador',
      }
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

  const approvalAs: 'admisiones' | 'revisor' | null =
    doc.status === 'EN_REVISION' && next === 'APROBADO'
      ? (opts?.approvalAs ??
        (user.role === 'admisiones'
          ? 'admisiones'
          : isRevisorRole(user.role)
            ? 'revisor'
            : 'admisiones'))
      : null

  const signedName = (
    opts?.electronic?.subjectCn ||
    opts?.signedName?.trim() ||
    user.name
  ).trim()
  const stampText = opts?.electronic?.stampText
  const at = opts?.electronic?.signedAt ?? new Date().toISOString()
  const cargo =
    opts?.cargo ?? cargoForSigningUser(user.id, roleLabel(user.role))

  // ——— Doble visto bueno: Admisiones + Revisor ———
  if (doc.status === 'EN_REVISION' && next === 'APROBADO' && approvalAs) {
    if (approvalAs === 'admisiones' && hasAdmisionesApproval(doc)) {
      return { ok: false, error: 'Admisiones ya dio el visto bueno' }
    }
    if (approvalAs === 'revisor' && hasRevisorApproval(doc)) {
      return { ok: false, error: 'El revisor ya aprobó este horario' }
    }

    const text = stampText ?? `${signedName} — ${cargo}`
    const electronic = opts?.electronic
      ? {
          ...opts.electronic,
          slot:
            approvalAs === 'admisiones'
              ? ('admisiones' as const)
              : ('revisor' as const),
        }
      : undefined

    let updated: ScheduleDoc = {
      ...doc,
      status: 'EN_REVISION',
      signatures: [
        ...doc.signatures,
        {
          role: approvalAs === 'admisiones' ? 'admisiones' : 'aprobado',
          name: signedName,
          cargo,
          at,
          userId: user.id,
          electronic: !!electronic,
          subjectCn: electronic?.subjectCn,
          certSerial: electronic?.serialNumber,
        },
      ],
      reviewComments: doc.reviewComments ?? [],
      electronicSigns: [...(doc.electronicSigns ?? [])],
    }

    if (electronic) {
      updated.electronicSigns = [
        ...(updated.electronicSigns ?? []).filter(
          (e) => e.slot !== electronic.slot,
        ),
        electronic,
      ]
    }

    if (approvalAs === 'admisiones') {
      updated = {
        ...updated,
        admisionesPor: text,
        admisionesApprovedAt: at,
      }
    } else {
      updated = {
        ...updated,
        revisadoPor: text,
        revisorApprovedAt: at,
      }
    }

    const both =
      hasAdmisionesApproval(updated) && hasRevisorApproval(updated)
    if (both) {
      updated = {
        ...updated,
        status: 'APROBADO',
        aprobadoPor:
          updated.aprobadoPor ||
          updated.revisadoPor ||
          text,
      }
    }

    const detail = both
      ? `Firma ${approvalAs}: ${signedName} · pasa a Aprobado`
      : `Firma parcial ${approvalAs}: ${signedName} · pendiente ${
          approvalAs === 'admisiones' ? 'revisor' : 'admisiones'
        }`
    updated = appendAudit(
      updated,
      user,
      both ? 'estado_APROBADO' : `visto_bueno_${approvalAs}`,
      detail,
    )
    return { ok: true, doc: updated }
  }

  const sigRole: ApprovalSignature['role'] =
    next === 'EN_REVISION'
      ? 'elaborado'
      : next === 'APROBADO'
        ? 'aprobado'
        : next === 'ARCHIVADO'
          ? 'validado'
          : 'revisado'

  const signature: ApprovalSignature = {
    role: sigRole,
    name: signedName,
    cargo,
    at,
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
      // Al enviar de nuevo, limpia vistos buenos previos
      admisionesPor: '',
      admisionesApprovedAt: undefined,
      revisorApprovedAt: undefined,
      revisadoPor: '',
      aprobadoPor: '',
      electronicSigns: (updated.electronicSigns ?? []).filter(
        (e) => e.slot === 'jefe',
      ),
    }
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
      revisadoPor: '',
      aprobadoPor: '',
      admisionesPor: '',
      admisionesApprovedAt: undefined,
      revisorApprovedAt: undefined,
      electronicSigns: (updated.electronicSigns ?? []).filter(
        (e) => e.slot === 'jefe',
      ),
    }
  }

  // Admin reabre horario cerrado → borrador limpio de firmas
  if (
    next === 'BORRADOR' &&
    (doc.status === 'APROBADO' || doc.status === 'ARCHIVADO')
  ) {
    updated = {
      ...updated,
      elaboradoPor: '',
      revisadoPor: '',
      aprobadoPor: '',
      talentoHumano: '',
      admisionesPor: '',
      admisionesApprovedAt: undefined,
      revisorApprovedAt: undefined,
      electronicSigns: [],
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
