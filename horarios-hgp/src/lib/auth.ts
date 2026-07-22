import type {
  ApprovalSignature,
  AppUser,
  ScheduleDoc,
  ScheduleStatus,
  UserRole,
} from '../types'
import { ROLE_LABEL, uid } from '../types'
import { canEditSchedule } from './validation'

const USER_KEY = 'hgp-auth-user-v1'

export const DEMO_USERS: AppUser[] = [
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
  {
    id: 'u-admin',
    email: 'admin@hgp.gob.ec',
    name: 'Administrador HGP',
    role: 'admin',
    serviceUnits: [],
  },
]

export function loadSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AppUser
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

export function logout() {
  localStorage.removeItem(USER_KEY)
}

export function roleLabel(role: UserRole): string {
  return ROLE_LABEL[role]
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

export function transitionStatus(
  doc: ScheduleDoc,
  next: ScheduleStatus,
  user: AppUser,
  cargo?: string,
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

  // Reglas de rol
  if (next === 'EN_REVISION' && user.role !== 'lider_servicio' && user.role !== 'admin') {
    return { ok: false, error: 'Solo el líder (o admin) envía a revisión' }
  }
  if (
    next === 'APROBADO' &&
    ![
      'direccion_asistencial',
      'subdireccion',
      'talento_humano',
      'gestion_enfermeria',
      'admin',
    ].includes(user.role)
  ) {
    return { ok: false, error: 'Su rol no puede aprobar' }
  }
  if (next === 'BORRADOR' && doc.status === 'APROBADO' && user.role !== 'admin') {
    return { ok: false, error: 'Solo admin puede reabrir un horario aprobado' }
  }

  const sigRole =
    next === 'EN_REVISION'
      ? 'elaborado'
      : next === 'APROBADO'
        ? user.role === 'talento_humano'
          ? 'talento_humano'
          : 'aprobado'
        : 'revisado'

  const signature: ApprovalSignature = {
    role: sigRole,
    name: user.name,
    cargo: cargo ?? roleLabel(user.role),
    at: new Date().toISOString(),
    userId: user.id,
  }

  let updated: ScheduleDoc = {
    ...doc,
    status: next,
    signatures: [...doc.signatures, signature],
  }

  if (next === 'EN_REVISION') {
    updated = {
      ...updated,
      elaboradoPor: `${user.name} — ${signature.cargo}`,
    }
  }
  if (next === 'APROBADO') {
    if (user.role === 'talento_humano') {
      updated = {
        ...updated,
        talentoHumano: `${user.name} — ${signature.cargo}`,
      }
    } else if (
      user.role === 'gestion_enfermeria' ||
      user.role === 'subdireccion'
    ) {
      updated = {
        ...updated,
        revisadoPor: `${user.name} — ${signature.cargo}`,
      }
    } else {
      updated = {
        ...updated,
        aprobadoPor: `${user.name} — ${signature.cargo}`,
      }
    }
  }

  updated = appendAudit(updated, user, `estado_${next}`, `Firma: ${signature.name}`)
  return { ok: true, doc: updated }
}

export function assertEditable(
  doc: ScheduleDoc,
  user: AppUser | null,
): boolean {
  return canEditSchedule(doc.status, user?.role ?? null)
}
