import { useEffect, useState } from 'react'
import type { AppUser } from '../types'
import { isJefeRole } from '../lib/auth'
import {
  listNotificationsFor,
  markAllNotificationsRead,
  markNotificationRead,
  unreadCountFor,
  type HgpNotification,
} from '../lib/notifications'

type Props = {
  user: AppUser | null
  /** Incrementar para forzar recarga (p. ej. tras validar en otra sesión). */
  refreshKey?: number
}

function canSeeNotifications(user: AppUser | null): boolean {
  if (!user) return false
  return (
    isJefeRole(user.role) ||
    user.role === 'admin' ||
    user.role === 'admisiones' ||
    user.role === 'validador' ||
    user.role === 'talento_humano'
  )
}

export function NotificationsBell({ user, refreshKey = 0 }: Props) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<HgpNotification[]>([])
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    setItems(listNotificationsFor(user))
    setUnread(unreadCountFor(user))
  }, [user, refreshKey])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'hgp-notifications-v1') {
        setItems(listNotificationsFor(user))
        setUnread(unreadCountFor(user))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [user])

  if (!canSeeNotifications(user)) {
    return null
  }

  function reload() {
    setItems(listNotificationsFor(user))
    setUnread(unreadCountFor(user))
  }

  const panelTitle =
    user?.role === 'admisiones'
      ? 'Avisos Admisiones'
      : user?.role === 'validador' || user?.role === 'talento_humano'
        ? 'Avisos Talento Humano'
        : user?.role === 'admin'
          ? 'Avisos'
          : 'Avisos del servicio'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
          reload()
        }}
        className="relative rounded-lg border border-white/25 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
        aria-label="Notificaciones"
      >
        Avisos
        {unread > 0 && (
          <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-teal-soft px-1.5 text-[11px] font-bold text-navy-deep">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,90vw)] rounded-xl border border-line bg-white text-ink shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <p className="text-sm font-semibold text-navy">{panelTitle}</p>
            {unread > 0 && (
              <button
                type="button"
                className="text-xs font-semibold text-teal hover:underline"
                onClick={() => {
                  markAllNotificationsRead(user!)
                  reload()
                }}
              >
                Marcar leídas
              </button>
            )}
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted">
                {user?.role === 'admisiones'
                  ? 'Sin avisos de Talento Humano'
                  : user?.role === 'validador' || user?.role === 'talento_humano'
                    ? 'Sin permisos pendientes de jefes'
                    : 'Sin avisos'}
              </li>
            ) : (
              items.slice(0, 20).map((n) => (
                <li
                  key={n.id}
                  className={`border-t border-line px-3 py-2.5 text-sm ${
                    n.read ? 'bg-white' : 'bg-teal/5'
                  }`}
                >
                  <p className="font-semibold text-navy">{n.title}</p>
                  <p className="mt-0.5 text-xs text-ink">{n.body}</p>
                  <p className="mt-1 text-[10px] text-muted">
                    {new Date(n.createdAt).toLocaleString('es-EC')}
                    {n.toRole === 'admisiones'
                      ? ' · Admisiones'
                      : n.toRole === 'validador'
                        ? ' · TH'
                        : ''}
                  </p>
                  {!n.read && (
                    <button
                      type="button"
                      className="mt-1 text-[11px] font-semibold text-navy underline"
                      onClick={() => {
                        markNotificationRead(n.id)
                        reload()
                      }}
                    >
                      Marcar leída
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Banner destacado cuando hay horario recién validado. */
export function ValidationNoticeBanner({
  user,
  refreshKey = 0,
}: {
  user: AppUser | null
  refreshKey?: number
}) {
  const [latest, setLatest] = useState<HgpNotification | null>(null)

  useEffect(() => {
    if (!user || (!isJefeRole(user.role) && user.role !== 'admin')) {
      setLatest(null)
      return
    }
    const unread = listNotificationsFor(user).filter((n) => !n.read)
    setLatest(unread[0] ?? null)
  }, [user, refreshKey])

  if (!latest) return null

  return (
    <div className="no-print mx-auto mb-4 max-w-[1700px] px-3 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-teal/40 bg-teal/10 px-4 py-3 shadow-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-teal">
            Aviso al jefe de servicio
          </p>
          <p className="font-display text-lg text-navy">{latest.title}</p>
          <p className="text-sm text-ink">{latest.body}</p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-teal/30 bg-white px-3 py-1.5 text-xs font-semibold text-navy"
          onClick={() => {
            markNotificationRead(latest.id)
            setLatest(null)
          }}
        >
          Entendido
        </button>
      </div>
    </div>
  )
}
