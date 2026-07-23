import { useEffect, useState } from 'react'
import {
  probeRemoteCatalog,
  syncCatalogsFromRemote,
  type RemoteCatalogStatus,
} from '../lib/remoteCatalog'
import { readLeavesLocal, replaceLeavesLocal } from '../lib/leavesStore'
import {
  readNotificationsLocal,
  replaceNotificationsLocal,
} from '../lib/notifications'
import { isRemoteEnabled } from '../lib/api'

type Props = {
  onFlash: (msg: string) => void
  onNotify?: () => void
}

const SQL_HINT = `supabase/migrations/20260723220000_leaves_notifications.sql`

/**
 * Estado de sincronización Supabase para permisos y notificaciones.
 */
export function AdminSupabaseSync({ onFlash, onNotify }: Props) {
  const [status, setStatus] = useState<RemoteCatalogStatus | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    setBusy(true)
    try {
      const s = await probeRemoteCatalog()
      setStatus(s)
    } catch (e) {
      onFlash(e instanceof Error ? e.message : 'No se pudo consultar Supabase')
    } finally {
      setBusy(false)
    }
  }

  async function syncNow() {
    setBusy(true)
    try {
      const s = await syncCatalogsFromRemote({
        getLocalLeaves: readLeavesLocal,
        setLocalLeaves: replaceLeavesLocal,
        getLocalNotifications: readNotificationsLocal,
        setLocalNotifications: replaceNotificationsLocal,
      })
      setStatus(s)
      onNotify?.()
      onFlash(
        s.configured
          ? `Sync OK · permisos ${s.leavesMode} (${s.leavesCount}) · avisos ${s.notificationsMode} (${s.notificationsCount})`
          : 'Supabase no configurado · solo local',
      )
    } catch (e) {
      onFlash(e instanceof Error ? e.message : 'Error al sincronizar')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const remote = isRemoteEnabled()

  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Supabase
          </p>
          <h2 className="font-display text-lg text-navy">
            Sync permisos y avisos
          </h2>
          <p className="mt-1 text-xs text-muted">
            Los horarios ya van a Supabase. Permisos/vacaciones y notificaciones
            se sincronizan aquí (tabla dedicada o bundle de respaldo).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void refresh()}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            Consultar
          </button>
          <button
            type="button"
            disabled={busy || !remote}
            onClick={() => void syncNow()}
            className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Sincronizando…' : 'Sincronizar ahora'}
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-sand/30 px-3 py-2">
          <p className="text-[10px] font-bold uppercase text-muted">Estado</p>
          <p className="font-semibold text-navy">
            {remote ? 'Conectado' : 'Solo local'}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-sand/30 px-3 py-2">
          <p className="text-[10px] font-bold uppercase text-muted">Permisos</p>
          <p className="font-semibold text-navy">
            {status?.leavesMode ?? '…'}
            {status ? ` · ${status.leavesCount}` : ''}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-sand/30 px-3 py-2">
          <p className="text-[10px] font-bold uppercase text-muted">Avisos</p>
          <p className="font-semibold text-navy">
            {status?.notificationsMode ?? '…'}
            {status ? ` · ${status.notificationsCount}` : ''}
          </p>
        </div>
      </div>

      {status?.leavesMode === 'bundle' || status?.notificationsMode === 'bundle' ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Aún no hay tablas dedicadas. Se usa un <strong>bundle</strong> en
          Supabase (funciona ya). Para el esquema óptimo ejecute en el SQL
          Editor: <code className="font-mono">{SQL_HINT}</code>
        </p>
      ) : null}

      {status?.lastError ? (
        <p className="mt-2 text-xs text-rose-800">{status.lastError}</p>
      ) : null}
    </section>
  )
}
