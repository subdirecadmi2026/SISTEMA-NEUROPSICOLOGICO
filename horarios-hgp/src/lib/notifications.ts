import type { AppUser, ScheduleDoc } from '../types'
import { MONTHS_ES, uid } from '../types'
import { isJefeRole } from './auth'
import {
  markNotificationReadRemote,
  pushAllNotificationsRemote,
} from './remoteCatalog'

const KEY = 'hgp-notifications-v1'

export type HgpNotification = {
  id: string
  createdAt: string
  read: boolean
  toRole: 'lider_servicio'
  /** Unidad / especialidad del horario (filtro para jefes). */
  unitName?: string
  scheduleId: string
  title: string
  body: string
  kind?: 'horario' | 'permiso' | 'permiso_alerta'
}

function loadAll(): HgpNotification[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HgpNotification[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveAll(list: HgpNotification[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)))
}

export function readNotificationsLocal(): HgpNotification[] {
  return loadAll()
}

export function replaceNotificationsLocal(list: HgpNotification[]) {
  saveAll(
    [...list]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 200),
  )
}

function queueRemoteNotificationsPush(list?: HgpNotification[]) {
  if (typeof window === 'undefined') return
  const payload = list ?? loadAll()
  void pushAllNotificationsRemote(payload).catch(() => undefined)
}

export function addNotification(
  partial: Omit<HgpNotification, 'id' | 'createdAt' | 'read'>,
): HgpNotification {
  const n: HgpNotification = {
    ...partial,
    id: uid('nt'),
    createdAt: new Date().toISOString(),
    read: false,
  }
  const all = loadAll()
  all.unshift(n)
  saveAll(all)
  queueRemoteNotificationsPush(all)
  return n
}

/** Aviso al jefe cuando el validador firma y valida. */
export function notifyJefeScheduleValidated(
  doc: ScheduleDoc,
  validatorName: string,
): HgpNotification {
  const period = `${MONTHS_ES[doc.month - 1]} ${doc.year}`
  return addNotification({
    toRole: 'lider_servicio',
    unitName: doc.unitName,
    scheduleId: doc.id,
    title: 'Horario validado',
    body: `Su horario de ${doc.unitName} (${period}) fue firmado y validado por ${validatorName}. Ya puede consultarlo en archivo.`,
    kind: 'horario',
  })
}

/** Aviso al jefe cuando el revisor devuelve con corrección. */
export function notifyJefeScheduleReturned(
  doc: ScheduleDoc,
  reviewerName: string,
  comment: string,
): HgpNotification {
  const period = `${MONTHS_ES[doc.month - 1]} ${doc.year}`
  const short = comment.trim().slice(0, 160)
  return addNotification({
    toRole: 'lider_servicio',
    unitName: doc.unitName,
    scheduleId: doc.id,
    title: 'Corrección solicitada',
    body: `El revisor ${reviewerName} devolvió el horario de ${doc.unitName} (${period}): «${short}»`,
    kind: 'horario',
  })
}

/** Aviso al jefe: se registró un permiso / vacaciones del personal. */
export function notifyJefeLeaveRegistered(opts: {
  unitName: string
  staffName: string
  kindLabel: string
  startDate: string
  endDate: string
  authorizedHours: number
  absenceCode: string
  registeredBy: string
}): HgpNotification {
  return addNotification({
    toRole: 'lider_servicio',
    unitName: opts.unitName,
    scheduleId: `leave:${opts.unitName}`,
    title: `${opts.kindLabel} registradas`,
    body: `${opts.staffName} · ${opts.startDate} → ${opts.endDate} · ${opts.authorizedHours} h autorizadas (clave ${opts.absenceCode}). Registró: ${opts.registeredBy}. Al llenar el horario se validará el uso de horas.`,
    kind: 'permiso',
  })
}

/** Aviso al jefe: el horario choca o excede permisos/vacaciones. */
export function notifyJefeLeaveScheduleAlert(opts: {
  doc: ScheduleDoc
  summary: string
}): HgpNotification {
  const period = `${MONTHS_ES[opts.doc.month - 1]} ${opts.doc.year}`
  return addNotification({
    toRole: 'lider_servicio',
    unitName: opts.doc.unitName,
    scheduleId: opts.doc.id,
    title: 'Alerta de permisos / vacaciones',
    body: `${opts.doc.unitName} (${period}): ${opts.summary}`,
    kind: 'permiso_alerta',
  })
}

/** Aviso al jefe: permiso cancelado o eliminado. */
export function notifyJefeLeaveChanged(opts: {
  unitName: string
  staffName: string
  kindLabel: string
  action: 'cancelado' | 'eliminado' | 'actualizado'
  by: string
}): HgpNotification {
  return addNotification({
    toRole: 'lider_servicio',
    unitName: opts.unitName,
    scheduleId: `leave:${opts.unitName}`,
    title: `Permiso ${opts.action}`,
    body: `${opts.kindLabel} de ${opts.staffName} (${opts.unitName}) fue ${opts.action} por ${opts.by}.`,
    kind: 'permiso',
  })
}

export function listNotificationsFor(user: AppUser | null): HgpNotification[] {
  if (!user) return []
  if (!isJefeRole(user.role) && user.role !== 'admin') return []
  return loadAll()
    .filter((n) => {
      if (n.toRole !== 'lider_servicio') return false
      if (user.role === 'admin') return true
      if (!n.unitName) return true
      if (!user.serviceUnits?.length) return true
      return user.serviceUnits.includes(n.unitName)
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function unreadCountFor(user: AppUser | null): number {
  return listNotificationsFor(user).filter((n) => !n.read).length
}

export function markNotificationRead(id: string) {
  const all = loadAll().map((n) => (n.id === id ? { ...n, read: true } : n))
  saveAll(all)
  queueRemoteNotificationsPush(all)
  void markNotificationReadRemote(id, true).catch(() => undefined)
}

export function markAllNotificationsRead(user: AppUser) {
  const mine = new Set(listNotificationsFor(user).map((n) => n.id))
  const all = loadAll().map((n) =>
    mine.has(n.id) ? { ...n, read: true } : n,
  )
  saveAll(all)
  queueRemoteNotificationsPush(all)
}
