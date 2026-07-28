import { getSupabase, isSupabaseConfigured } from './supabase'

export type DbLinkMode = 'table' | 'bundle' | 'local' | 'error'

export type DbHealthReport = {
  configured: boolean
  reachable: boolean
  schedulesOk: boolean
  servicesOk: boolean
  staffLibraryOk: boolean
  leaves: DbLinkMode
  notifications: DbLinkMode
  users: DbLinkMode
  signers: DbLinkMode
  shifts: DbLinkMode
  holidays: DbLinkMode
  message: string
  checkedAt: string
}

function isMissingTableError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  const msg = (err.message ?? '').toLowerCase()
  return (
    err.code === 'PGRST205' ||
    err.code === '42P01' ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist')
  )
}

async function linkMode(
  table: string,
  bundleId: string,
): Promise<DbLinkMode> {
  const sb = getSupabase()
  if (!sb) return 'local'
  const t = await sb.from(table).select('id', { count: 'exact', head: true })
  if (!t.error) return 'table'
  if (!isMissingTableError(t.error)) return 'error'
  const b = await sb
    .from('schedules')
    .select('id')
    .eq('id', bundleId)
    .maybeSingle()
  return b.data ? 'bundle' : 'bundle'
}

/** Diagnóstico real de conectividad y modo por catálogo. */
export async function checkDbHealth(): Promise<DbHealthReport> {
  const checkedAt = new Date().toISOString()
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      reachable: false,
      schedulesOk: false,
      servicesOk: false,
      staffLibraryOk: false,
      leaves: 'local',
      notifications: 'local',
      users: 'local',
      signers: 'local',
      shifts: 'local',
      holidays: 'local',
      message: 'Supabase no configurado · modo local',
      checkedAt,
    }
  }

  const sb = getSupabase()
  if (!sb) {
    return {
      configured: true,
      reachable: false,
      schedulesOk: false,
      servicesOk: false,
      staffLibraryOk: false,
      leaves: 'local',
      notifications: 'local',
      users: 'local',
      signers: 'local',
      shifts: 'local',
      holidays: 'local',
      message: 'Cliente Supabase no disponible',
      checkedAt,
    }
  }

  try {
    const schedules = await sb
      .from('schedules')
      .select('id', { count: 'exact', head: true })
    if (schedules.error) {
      return {
        configured: true,
        reachable: false,
        schedulesOk: false,
        servicesOk: false,
        staffLibraryOk: false,
        leaves: 'error',
        notifications: 'error',
        users: 'error',
        signers: 'error',
        shifts: 'error',
        holidays: 'error',
        message: `Sin acceso a schedules: ${schedules.error.message}`,
        checkedAt,
      }
    }

    const [services, staffLib, leaves, notifs, users, signers, shifts, holidays] =
      await Promise.all([
        sb.from('services').select('id', { count: 'exact', head: true }),
        sb.from('staff_library').select('id', { count: 'exact', head: true }),
        linkMode('staff_leaves', 'sys-hgp-staff-leaves'),
        linkMode('hgp_notifications', 'sys-hgp-notifications'),
        linkMode('hgp_app_users', 'sys-hgp-app-users'),
        linkMode('hospital_signers', 'sys-hgp-signers'),
        linkMode('shift_codes', 'sys-hgp-shifts'),
        linkMode('holiday_overrides', 'sys-hgp-holidays'),
      ])

    const servicesOk = !services.error
    const staffLibraryOk = !staffLib.error
    const bundleHeavy = [leaves, notifs, users, signers, shifts, holidays].some(
      (m) => m === 'bundle',
    )

    return {
      configured: true,
      reachable: true,
      schedulesOk: true,
      servicesOk,
      staffLibraryOk,
      leaves,
      notifications: notifs,
      users,
      signers,
      shifts,
      holidays,
      message: bundleHeavy
        ? 'Conectado · horarios OK · algunos catálogos en bundle (ejecute migración full_app_sync)'
        : 'Conectado · tablas dedicadas activas',
      checkedAt,
    }
  } catch (e) {
    return {
      configured: true,
      reachable: false,
      schedulesOk: false,
      servicesOk: false,
      staffLibraryOk: false,
      leaves: 'error',
      notifications: 'error',
      users: 'error',
      signers: 'error',
      shifts: 'error',
      holidays: 'error',
      message: e instanceof Error ? e.message : 'Error de red con Supabase',
      checkedAt,
    }
  }
}

export function modeLabel(mode: DbLinkMode): string {
  switch (mode) {
    case 'table':
      return 'tabla'
    case 'bundle':
      return 'bundle'
    case 'error':
      return 'error'
    default:
      return 'local'
  }
}
