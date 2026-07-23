import type { AppUser, ScheduleDoc } from '../types'
import { MONTHS_ES, uid } from '../types'
import { isJefeRole } from './auth'

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
  return n
}

/** Aviso al jefe cuando el validador firma y aprueba. */
export function notifyJefeScheduleValidated(
  doc: ScheduleDoc,
  validatorName: string,
): HgpNotification {
  const period = `${MONTHS_ES[doc.month - 1]} ${doc.year}`
  return addNotification({
    toRole: 'lider_servicio',
    unitName: doc.unitName,
    scheduleId: doc.id,
    title: 'Horario aprobado',
    body: `Su horario de ${doc.unitName} (${period}) fue firmado y aprobado por el validador ${validatorName}.`,
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
}

export function markAllNotificationsRead(user: AppUser) {
  const mine = new Set(listNotificationsFor(user).map((n) => n.id))
  const all = loadAll().map((n) =>
    mine.has(n.id) ? { ...n, read: true } : n,
  )
  saveAll(all)
}
