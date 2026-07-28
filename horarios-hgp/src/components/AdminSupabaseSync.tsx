import { useEffect, useState } from 'react'
import {
  syncCatalogsFromRemote,
  type RemoteCatalogStatus,
} from '../lib/remoteCatalog'
import {
  checkDbHealth,
  modeLabel,
  type DbHealthReport,
} from '../lib/dbHealth'
import { readLeavesLocal, replaceLeavesLocal } from '../lib/leavesStore'
import {
  readNotificationsLocal,
  replaceNotificationsLocal,
} from '../lib/notifications'
import { isRemoteEnabled } from '../lib/api'

type Props = {
  onFlash: (msg: string) => void
  onNotify?: () => void
  onSynced?: () => void
}

const SQL_HINT = `supabase/migrations/20260724210000_full_app_sync.sql`

/**
 * Estado de sincronización Supabase para todo el sistema HGP.
 */
export function AdminSupabaseSync({ onFlash, onNotify, onSynced }: Props) {
  const [catalog, setCatalog] = useState<RemoteCatalogStatus | null>(null)
  const [health, setHealth] = useState<DbHealthReport | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    setBusy(true)
    try {
      const h = await checkDbHealth()
      setHealth(h)
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
      setCatalog(s)
      const h = await checkDbHealth()
      setHealth(h)
      onNotify?.()
      onSynced?.()
      onFlash(
        h.reachable
          ? `Sync OK · ${h.message}`
          : 'Supabase no alcanzable · datos locales activos',
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
    health &&
    [health.leaves, health.notifications, health.users, health.signers, health.shifts, health.holidays].some(
      (m) => m === 'bundle',
    )

  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Supabase
          </p>
          <h2 className="font-display text-lg text-navy">
            Conexión a la base de datos
          </h2>
          <p className="mt-1 text-xs text-muted">
            Horarios, personal, permisos, avisos, usuarios, unidades, firmas,
            claves y feriados. Si falta una tabla, se usa bundle de respaldo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void refresh()}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            Diagnosticar
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

      <div
        className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
          health?.reachable
            ? 'border-teal/30 bg-teal/5 text-navy'
            : remote
              ? 'border-amber-200 bg-amber-50 text-amber-950'
              : 'border-line bg-sand/30 text-muted'
        }`}
      >
        <strong>
          {health?.reachable
            ? '● En línea'
            : remote
              ? '○ Configurado sin respuesta'
              : '○ Solo local'}
        </strong>
        {health ? ` · ${health.message}` : ' · consultando…'}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[
          {
            label: 'Horarios',
            value: health?.schedulesOk ? 'tabla OK' : '—',
          },
          {
            label: 'Unidades',
            value: health?.servicesOk ? 'tabla OK' : '—',
          },
          {
            label: 'Personal',
            value: health?.staffLibraryOk
              ? `tabla${catalog ? ` · ${catalog.staffLibraryCount}` : ''}`
              : '—',
          },
          {
            label: 'Permisos',
            value: `${modeLabel(health?.leaves ?? 'local')}${catalog ? ` · ${catalog.leavesCount}` : ''}`,
          },
          {
            label: 'Avisos',
            value: `${modeLabel(health?.notifications ?? 'local')}${catalog ? ` · ${catalog.notificationsCount}` : ''}`,
          },
          {
            label: 'Usuarios',
            value: modeLabel(health?.users ?? 'local'),
          },
          {
            label: 'Firmas',
            value: modeLabel(health?.signers ?? 'local'),
          },
          {
            label: 'Claves',
            value: modeLabel(health?.shifts ?? 'local'),
          },
          {
            label: 'Feriados',
            value: modeLabel(health?.holidays ?? 'local'),
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
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <p>
            Algunos catálogos usan <strong>bundle</strong> en{' '}
            <code className="font-mono">schedules</code> (ya sincroniza entre
            equipos). Para tablas dedicadas ejecute en SQL Editor de Supabase:
          </p>
          <code className="mt-1 block break-all font-mono text-[11px]">
            {SQL_HINT}
          </code>
          <button
            type="button"
            className="mt-2 rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold"
            onClick={() => {
              void navigator.clipboard?.writeText(SQL_HINT)
              onFlash('Ruta de migración copiada')
            }}
          >
            Copiar ruta SQL
          </button>
        </div>
      ) : null}

      {catalog?.lastError ? (
        <p className="mt-2 text-xs text-rose-800">{catalog.lastError}</p>
      ) : null}
    </section>
  )
}
