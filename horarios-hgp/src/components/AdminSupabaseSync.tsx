import { useEffect, useState } from 'react'
import {
  probeRemoteCatalog,
  syncCatalogsFromRemote,
  type RemoteCatalogStatus,
} from '../lib/remoteCatalog'
import {
  probeAppConfigRemote,
  type AppConfigSyncStatus,
} from '../lib/remoteAppState'
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

const SQL_HINT = `supabase/migrations/20260724210000_full_app_sync.sql`

/**
 * Estado de sincronización Supabase para todo el sistema HGP.
 */
export function AdminSupabaseSync({ onFlash, onNotify }: Props) {
  const [status, setStatus] = useState<RemoteCatalogStatus | null>(null)
  const [appStatus, setAppStatus] = useState<AppConfigSyncStatus | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    setBusy(true)
    try {
      const [s, a] = await Promise.all([
        probeRemoteCatalog(),
        probeAppConfigRemote(),
      ])
      setStatus(s)
      setAppStatus(a)
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
      setAppStatus(s.appConfig ?? (await probeAppConfigRemote()))
      onNotify?.()
      onFlash(
        s.configured
          ? `Sync OK · horarios/personal/permisos/avisos + usuarios/unidades/firmas/claves/feriados`
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
  const usingBundle =
    status?.staffLibraryMode === 'bundle' ||
    status?.leavesMode === 'bundle' ||
    status?.notificationsMode === 'bundle' ||
    appStatus?.usersMode === 'bundle' ||
    appStatus?.signersMode === 'bundle' ||
    appStatus?.shiftsMode === 'bundle' ||
    appStatus?.holidaysMode === 'bundle'

  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Supabase
          </p>
          <h2 className="font-display text-lg text-navy">
            Conexión completa a la base de datos
          </h2>
          <p className="mt-1 text-xs text-muted">
            Horarios, personal, permisos, avisos, usuarios, unidades, firmas,
            claves y feriados se sincronizan con Supabase (tabla dedicada o
            bundle de respaldo).
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

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[
          {
            label: 'Estado',
            value: remote ? 'Conectado' : 'Solo local',
          },
          {
            label: 'Personal',
            value: `${status?.staffLibraryMode ?? '…'}${status ? ` · ${status.staffLibraryCount}` : ''}`,
          },
          {
            label: 'Permisos',
            value: `${status?.leavesMode ?? '…'}${status ? ` · ${status.leavesCount}` : ''}`,
          },
          {
            label: 'Avisos',
            value: `${status?.notificationsMode ?? '…'}${status ? ` · ${status.notificationsCount}` : ''}`,
          },
          {
            label: 'Unidades',
            value: `${appStatus?.unitsMode ?? '…'}${appStatus ? ` · ${appStatus.unitsCount}` : ''}`,
          },
          {
            label: 'Usuarios',
            value: `${appStatus?.usersMode ?? '…'}${appStatus ? ` · ${appStatus.usersCount}` : ''}`,
          },
          {
            label: 'Firmas',
            value: `${appStatus?.signersMode ?? '…'}${appStatus ? ` · ${appStatus.signersCount}` : ''}`,
          },
          {
            label: 'Claves',
            value: `${appStatus?.shiftsMode ?? '…'}${appStatus ? ` · ${appStatus.shiftsCount}` : ''}`,
          },
          {
            label: 'Feriados',
            value: `${appStatus?.holidaysMode ?? '…'}${appStatus ? ` · ${appStatus.holidaysCount}` : ''}`,
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-line bg-sand/30 px-3 py-2"
          >
            <p className="text-[10px] font-bold uppercase text-muted">
              {k.label}
            </p>
            <p className="font-semibold text-navy">{k.value}</p>
          </div>
        ))}
      </div>

      {usingBundle ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Algunas piezas usan <strong>bundle</strong> de respaldo en{' '}
          <code className="font-mono">schedules</code> (ya sincroniza entre
          navegadores). Para tablas dedicadas ejecute en el SQL Editor:{' '}
          <code className="font-mono">{SQL_HINT}</code>
        </p>
      ) : null}

      {status?.lastError || appStatus?.lastError ? (
        <p className="mt-2 text-xs text-rose-800">
          {status?.lastError || appStatus?.lastError}
        </p>
      ) : null}
    </section>
  )
}
