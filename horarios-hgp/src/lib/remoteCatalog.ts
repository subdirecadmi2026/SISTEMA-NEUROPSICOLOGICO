import type { ScheduleDoc, ServiceType } from '../types'
import { DEFAULT_COVERAGE } from '../types'
import { getSupabase, isSupabaseConfigured } from './supabase'
import { saveSchedule } from './storage'
import type { StaffLeave } from './leavesStore'
import type { HgpNotification } from './notifications'
import {
  flattenStaffLibrary,
  mergeStaffLibraryEntries,
  replaceAllStaffLibrary,
  type StaffLibraryEntry,
} from './staffLibrary'

/** IDs de filas-sistema en `schedules` (fallback si aún no existen tablas dedicadas). */
export const SYS_LEAVES_ID = 'sys-hgp-staff-leaves'
export const SYS_NOTIF_ID = 'sys-hgp-notifications'
export const SYS_STAFF_LIB_ID = 'sys-hgp-staff-library'
export const SYS_LEAVES_UNIT = '__SYSTEM__/staff_leaves'
export const SYS_NOTIF_UNIT = '__SYSTEM__/notifications'
export const SYS_STAFF_LIB_UNIT = '__SYSTEM__/staff_library'

export type RemoteCatalogStatus = {
  configured: boolean
  leavesMode: 'table' | 'bundle' | 'local' | 'unknown'
  notificationsMode: 'table' | 'bundle' | 'local' | 'unknown'
  staffLibraryMode: 'table' | 'bundle' | 'local' | 'unknown'
  leavesCount: number
  notificationsCount: number
  staffLibraryCount: number
  lastError?: string
}

type LeavesBundlePayload = ScheduleDoc & {
  systemKind?: 'staff_leaves'
  systemItems?: StaffLeave[]
}

type NotifBundlePayload = ScheduleDoc & {
  systemKind?: 'notifications'
  systemItems?: HgpNotification[]
}

type StaffLibBundlePayload = ScheduleDoc & {
  systemKind?: 'staff_library'
  systemItems?: StaffLibraryEntry[]
}

function baseSystemDoc(
  id: string,
  unitName: string,
): ScheduleDoc {
  const now = new Date().toISOString()
  return {
    id,
    hospital: 'Hospital General Puyo',
    provincial: 'PASTAZA',
    serviceType: 'medico',
    department: 'Sistema HGP',
    unitName,
    jefeServicio: 'SYSTEM',
    month: 1,
    year: 2099,
    staff: [],
    cells: {},
    areaCells: {},
    notes: '',
    contingencyPlan: '',
    contingencyStaff: [],
    llamado: false,
    vacacionesFlag: false,
    elaboradoPor: '',
    revisadoPor: '',
    aprobadoPor: '',
    talentoHumano: '',
    status: 'BORRADOR',
    version: 1,
    signatures: [],
    electronicSigns: [],
    audit: [],
    reviewComments: [],
    coverageRule: DEFAULT_COVERAGE,
    updatedAt: now,
    createdBy: 'system',
  }
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

function leaveToRow(l: StaffLeave) {
  return {
    id: l.id,
    staff_id: l.staffId,
    staff_name: l.staffName,
    service_type: l.serviceType,
    unit_name: l.unitName,
    kind: l.kind,
    absence_code: l.absenceCode,
    start_date: l.startDate,
    end_date: l.endDate,
    authorized_hours: l.authorizedHours,
    hours_per_day: l.hoursPerDay,
    notes: l.notes,
    status: l.status,
    created_by: l.createdBy ?? null,
    created_by_name: l.createdByName ?? null,
    created_at: l.createdAt,
    updated_at: l.updatedAt,
  }
}

function rowToLeave(r: Record<string, unknown>): StaffLeave {
  return {
    id: String(r.id),
    staffId: String(r.staff_id),
    staffName: String(r.staff_name),
    serviceType: r.service_type as StaffLeave['serviceType'],
    unitName: String(r.unit_name),
    kind: r.kind as StaffLeave['kind'],
    absenceCode: String(r.absence_code),
    startDate: String(r.start_date).slice(0, 10),
    endDate: String(r.end_date).slice(0, 10),
    authorizedHours: Number(r.authorized_hours) || 0,
    hoursPerDay: (() => {
      const n = Number(r.hours_per_day)
      return Number.isFinite(n) && n > 0 && n <= 24 ? n : 8
    })(),
    notes: String(r.notes ?? ''),
    status: (r.status as StaffLeave['status']) || 'activo',
    createdAt: String(r.created_at ?? new Date().toISOString()),
    updatedAt: String(r.updated_at ?? new Date().toISOString()),
    createdBy: r.created_by ? String(r.created_by) : undefined,
    createdByName: r.created_by_name
      ? String(r.created_by_name)
      : undefined,
  }
}

function notifToRow(n: HgpNotification) {
  return {
    id: n.id,
    created_at: n.createdAt,
    read: n.read,
    to_role: n.toRole,
    unit_name: n.unitName ?? null,
    schedule_id: n.scheduleId,
    title: n.title,
    body: n.body,
    kind: n.kind ?? null,
  }
}

function rowToNotif(r: Record<string, unknown>): HgpNotification {
  return {
    id: String(r.id),
    createdAt: String(r.created_at ?? new Date().toISOString()),
    read: Boolean(r.read),
    toRole: 'lider_servicio',
    unitName: r.unit_name ? String(r.unit_name) : undefined,
    scheduleId: String(r.schedule_id),
    title: String(r.title),
    body: String(r.body),
    kind: (r.kind as HgpNotification['kind']) || undefined,
  }
}

function staffEntryToRow(e: StaffLibraryEntry) {
  return {
    id: e.id,
    service_type: e.serviceType,
    unit_name: e.unitName,
    fun: e.fun,
    name: e.name,
    role: e.role ?? null,
    relacion_laboral: e.relacionLaboral ?? null,
    codigo_personal: e.codigoPersonal ?? null,
    section: e.section ?? null,
    active: e.active !== false,
    sort_order: e.order ?? 1,
    horas_medicas: e.horasMedicas ?? 0,
    horas_violencia_domestica: e.horasViolenciaDomestica ?? 0,
    horas_lactancia: e.horasLactancia ?? 0,
    horas_extras: e.horasExtras ?? 0,
    observaciones: e.observaciones ?? '',
    updated_at: e.updatedAt || new Date().toISOString(),
  }
}

function rowToStaffEntry(r: Record<string, unknown>): StaffLibraryEntry {
  return {
    id: String(r.id),
    serviceType: r.service_type as ServiceType,
    unitName: String(r.unit_name ?? r.service_unit ?? ''),
    fun: String(r.fun ?? 'MED'),
    name: String(r.name ?? ''),
    role: String(r.role ?? ''),
    relacionLaboral: String(r.relacion_laboral ?? 'LOSEP'),
    codigoPersonal: String(r.codigo_personal ?? ''),
    section: r.section ? String(r.section) : undefined,
    serviceUnit: String(r.unit_name ?? r.service_unit ?? ''),
    active: r.active !== false,
    order: Number(r.sort_order) || 1,
    horasMedicas: Number(r.horas_medicas) || 0,
    horasViolenciaDomestica: Number(r.horas_violencia_domestica) || 0,
    horasLactancia: Number(r.horas_lactancia) || 0,
    horasExtras: Number(r.horas_extras) || 0,
    observaciones: String(r.observaciones ?? ''),
    updatedAt: String(r.updated_at ?? new Date().toISOString()),
  }
}

async function upsertSystemBundle(
  id: string,
  unitName: string,
  kind: 'staff_leaves' | 'notifications' | 'staff_library',
  items: unknown[],
): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  const base = baseSystemDoc(id, unitName)
  const payload =
    kind === 'staff_leaves'
      ? ({
          ...base,
          systemKind: 'staff_leaves',
          systemItems: items as StaffLeave[],
          updatedAt: new Date().toISOString(),
        } satisfies LeavesBundlePayload)
      : kind === 'notifications'
        ? ({
            ...base,
            systemKind: 'notifications',
            systemItems: items as HgpNotification[],
            updatedAt: new Date().toISOString(),
          } satisfies NotifBundlePayload)
        : ({
            ...base,
            systemKind: 'staff_library',
            systemItems: items as StaffLibraryEntry[],
            updatedAt: new Date().toISOString(),
          } satisfies StaffLibBundlePayload)

  const row = {
    id,
    hospital: payload.hospital,
    provincial: payload.provincial,
    service_type: payload.serviceType,
    department: payload.department,
    unit_name: unitName,
    jefe_servicio: payload.jefeServicio,
    month: 1,
    year: 2099,
    notes: '',
    contingency_plan: '',
    llamado: false,
    vacaciones_flag: false,
    elaborado_por: '',
    revisado_por: '',
    aprobado_por: '',
    talento_humano: '',
    status: 'BORRADOR',
    version: 1,
    coverage_rule: payload.coverageRule,
    payload,
    updated_at: payload.updatedAt,
    created_by: 'system',
  }
  const { error } = await sb.from('schedules').upsert(row, { onConflict: 'id' })
  if (error) throw new Error(error.message)
  saveSchedule(payload as ScheduleDoc)
}

async function fetchSystemBundleItems<T>(
  id: string,
  kind: 'staff_leaves' | 'notifications' | 'staff_library',
): Promise<T[] | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from('schedules')
    .select('payload')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.payload) return []
  const payload = data.payload as
    | LeavesBundlePayload
    | NotifBundlePayload
    | StaffLibBundlePayload
  if (payload.systemKind !== kind) return []
  return (payload.systemItems as T[]) ?? []
}

function mergeByUpdatedAt<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  local: T[],
  remote: T[],
): T[] {
  const map = new Map<string, T>()
  for (const item of local) map.set(item.id, item)
  for (const item of remote) {
    const prev = map.get(item.id)
    if (!prev) {
      map.set(item.id, item)
      continue
    }
    const a = item.updatedAt || item.createdAt || ''
    const b = prev.updatedAt || prev.createdAt || ''
    if (a >= b) map.set(item.id, item)
  }
  return [...map.values()]
}

/** Detecta si existen las tablas dedicadas. */
export async function probeRemoteCatalog(): Promise<RemoteCatalogStatus> {
  const status: RemoteCatalogStatus = {
    configured: isSupabaseConfigured(),
    leavesMode: 'unknown',
    notificationsMode: 'unknown',
    staffLibraryMode: 'unknown',
    leavesCount: 0,
    notificationsCount: 0,
    staffLibraryCount: 0,
  }
  if (!status.configured) {
    status.leavesMode = 'local'
    status.notificationsMode = 'local'
    status.staffLibraryMode = 'local'
    return status
  }
  const sb = getSupabase()
  if (!sb) {
    status.leavesMode = 'local'
    status.notificationsMode = 'local'
    status.staffLibraryMode = 'local'
    return status
  }

  const leavesProbe = await sb.from('staff_leaves').select('id', { count: 'exact', head: true })
  if (!leavesProbe.error) {
    status.leavesMode = 'table'
    status.leavesCount = leavesProbe.count ?? 0
  } else if (isMissingTableError(leavesProbe.error)) {
    status.leavesMode = 'bundle'
  } else {
    status.lastError = leavesProbe.error.message
    status.leavesMode = 'bundle'
  }

  const notifProbe = await sb
    .from('hgp_notifications')
    .select('id', { count: 'exact', head: true })
  if (!notifProbe.error) {
    status.notificationsMode = 'table'
    status.notificationsCount = notifProbe.count ?? 0
  } else if (isMissingTableError(notifProbe.error)) {
    status.notificationsMode = 'bundle'
  } else {
    status.lastError = notifProbe.error.message
    status.notificationsMode = 'bundle'
  }

  const staffProbe = await sb
    .from('staff_library')
    .select('id', { count: 'exact', head: true })
  if (!staffProbe.error) {
    status.staffLibraryMode = 'table'
    status.staffLibraryCount = staffProbe.count ?? 0
  } else if (isMissingTableError(staffProbe.error)) {
    status.staffLibraryMode = 'bundle'
  } else {
    status.lastError = staffProbe.error.message
    status.staffLibraryMode = 'bundle'
  }

  return status
}

export async function pullLeavesRemote(local: StaffLeave[]): Promise<{
  items: StaffLeave[]
  mode: 'table' | 'bundle' | 'local'
}> {
  if (!isSupabaseConfigured()) return { items: local, mode: 'local' }
  const sb = getSupabase()
  if (!sb) return { items: local, mode: 'local' }

  const table = await sb.from('staff_leaves').select('*').limit(2000)
  if (!table.error && table.data) {
    const remote = table.data.map((r) => rowToLeave(r as Record<string, unknown>))
    return { items: mergeByUpdatedAt(local, remote), mode: 'table' }
  }
  if (table.error && !isMissingTableError(table.error)) {
    throw new Error(table.error.message)
  }

  const remote = (await fetchSystemBundleItems<StaffLeave>(
    SYS_LEAVES_ID,
    'staff_leaves',
  )) ?? []
  return { items: mergeByUpdatedAt(local, remote), mode: 'bundle' }
}

export async function pushLeaveRemote(
  leave: StaffLeave,
  preferMode?: 'table' | 'bundle',
): Promise<'table' | 'bundle' | 'local'> {
  if (!isSupabaseConfigured()) return 'local'
  const sb = getSupabase()
  if (!sb) return 'local'

  if (preferMode !== 'bundle') {
    const { error } = await sb
      .from('staff_leaves')
      .upsert(leaveToRow(leave), { onConflict: 'id' })
    if (!error) return 'table'
    if (!isMissingTableError(error)) throw new Error(error.message)
  }

  // Fallback: reescribe el bundle completo con el estado local+este leave
  // (el caller debe pasar lista completa vía pushAllLeavesRemote)
  return 'bundle'
}

export async function pushAllLeavesRemote(leaves: StaffLeave[]): Promise<'table' | 'bundle' | 'local'> {
  if (!isSupabaseConfigured()) return 'local'
  const sb = getSupabase()
  if (!sb) return 'local'

  const { error } = await sb.from('staff_leaves').upsert(leaves.map(leaveToRow), {
    onConflict: 'id',
  })
  if (!error) return 'table'
  if (!isMissingTableError(error)) throw new Error(error.message)

  await upsertSystemBundle(
    SYS_LEAVES_ID,
    SYS_LEAVES_UNIT,
    'staff_leaves',
    leaves,
  )
  return 'bundle'
}

export async function deleteLeaveRemote(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  const sb = getSupabase()
  if (!sb) return
  const { error } = await sb.from('staff_leaves').delete().eq('id', id)
  if (error && !isMissingTableError(error)) throw new Error(error.message)
  // Si usa bundle, el caller hace pushAllLeavesRemote tras borrar local
}

export async function pullNotificationsRemote(local: HgpNotification[]): Promise<{
  items: HgpNotification[]
  mode: 'table' | 'bundle' | 'local'
}> {
  if (!isSupabaseConfigured()) return { items: local, mode: 'local' }
  const sb = getSupabase()
  if (!sb) return { items: local, mode: 'local' }

  const table = await sb
    .from('hgp_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (!table.error && table.data) {
    const remote = table.data.map((r) => rowToNotif(r as Record<string, unknown>))
    const merged = mergeByUpdatedAt(
      local.map((n) => ({ ...n, updatedAt: n.createdAt })),
      remote.map((n) => ({ ...n, updatedAt: n.createdAt })),
    ).map(({ updatedAt: _u, ...n }) => n as HgpNotification)
    return {
      items: merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200),
      mode: 'table',
    }
  }
  if (table.error && !isMissingTableError(table.error)) {
    throw new Error(table.error.message)
  }

  const remote =
    (await fetchSystemBundleItems<HgpNotification>(SYS_NOTIF_ID, 'notifications')) ??
    []
  const merged = mergeByUpdatedAt(
    local.map((n) => ({ ...n, updatedAt: n.createdAt })),
    remote.map((n) => ({ ...n, updatedAt: n.createdAt })),
  ).map(({ updatedAt: _u, ...n }) => n as HgpNotification)
  return {
    items: merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200),
    mode: 'bundle',
  }
}

export async function pushNotificationRemote(
  n: HgpNotification,
): Promise<'table' | 'bundle' | 'local'> {
  if (!isSupabaseConfigured()) return 'local'
  const sb = getSupabase()
  if (!sb) return 'local'
  const { error } = await sb
    .from('hgp_notifications')
    .upsert(notifToRow(n), { onConflict: 'id' })
  if (!error) return 'table'
  if (!isMissingTableError(error)) throw new Error(error.message)
  return 'bundle'
}

export async function pushAllNotificationsRemote(
  list: HgpNotification[],
): Promise<'table' | 'bundle' | 'local'> {
  if (!isSupabaseConfigured()) return 'local'
  const sb = getSupabase()
  if (!sb) return 'local'
  const { error } = await sb
    .from('hgp_notifications')
    .upsert(list.map(notifToRow), { onConflict: 'id' })
  if (!error) return 'table'
  if (!isMissingTableError(error)) throw new Error(error.message)
  await upsertSystemBundle(
    SYS_NOTIF_ID,
    SYS_NOTIF_UNIT,
    'notifications',
    list.slice(0, 200),
  )
  return 'bundle'
}

export async function markNotificationReadRemote(id: string, read = true): Promise<void> {
  if (!isSupabaseConfigured()) return
  const sb = getSupabase()
  if (!sb) return
  const { error } = await sb
    .from('hgp_notifications')
    .update({ read })
    .eq('id', id)
  if (error && !isMissingTableError(error)) throw new Error(error.message)
}

/**
 * Arranque: trae permisos, notificaciones y biblioteca de personal desde Supabase
 * y los fusiona con localStorage.
 */
export async function syncCatalogsFromRemote(opts: {
  getLocalLeaves: () => StaffLeave[]
  setLocalLeaves: (items: StaffLeave[]) => void
  getLocalNotifications: () => HgpNotification[]
  setLocalNotifications: (items: HgpNotification[]) => void
}): Promise<RemoteCatalogStatus> {
  const status = await probeRemoteCatalog()
  if (!status.configured) return status

  try {
    const leaves = await pullLeavesRemote(opts.getLocalLeaves())
    opts.setLocalLeaves(leaves.items)
    status.leavesMode = leaves.mode
    status.leavesCount = leaves.items.length
    // Empuja merge al remoto para que otros clientes vean lo local previo
    await pushAllLeavesRemote(leaves.items)
  } catch (e) {
    status.lastError = e instanceof Error ? e.message : 'Error sync permisos'
  }

  try {
    const notifs = await pullNotificationsRemote(opts.getLocalNotifications())
    opts.setLocalNotifications(notifs.items)
    status.notificationsMode = notifs.mode
    status.notificationsCount = notifs.items.length
    await pushAllNotificationsRemote(notifs.items)
  } catch (e) {
    status.lastError = e instanceof Error ? e.message : 'Error sync avisos'
  }

  try {
    const staff = await pullStaffLibraryRemote(flattenStaffLibrary())
    replaceAllStaffLibrary(staff.items, { syncRemote: false })
    status.staffLibraryMode = staff.mode
    status.staffLibraryCount = staff.items.length
    await pushAllStaffLibraryRemote(staff.items)
  } catch (e) {
    status.lastError = e instanceof Error ? e.message : 'Error sync personal'
  }

  return status
}

export async function pullStaffLibraryRemote(
  local: StaffLibraryEntry[],
): Promise<{
  items: StaffLibraryEntry[]
  mode: 'table' | 'bundle' | 'local'
}> {
  if (!isSupabaseConfigured()) return { items: local, mode: 'local' }
  const sb = getSupabase()
  if (!sb) return { items: local, mode: 'local' }

  const table = await sb.from('staff_library').select('*').limit(5000)
  if (!table.error && table.data) {
    const remote = table.data.map((r) =>
      rowToStaffEntry(r as Record<string, unknown>),
    )
    // También incorpora personal de horarios ya guardados en public.staff
    const legacy = await sb.from('staff').select('*').limit(5000)
    const fromSchedules: StaffLibraryEntry[] = []
    if (!legacy.error && legacy.data) {
      for (const r of legacy.data) {
        const row = r as Record<string, unknown>
        const name = String(row.name ?? '').trim()
        const unit = String(row.service_unit ?? '').trim()
        if (!name || !unit) continue
        const serviceType = (row.service_type as ServiceType | null) || null
        if (!serviceType) continue
        fromSchedules.push(
          rowToStaffEntry({
            ...row,
            unit_name: unit,
            service_type: serviceType,
            updated_at: row.created_at ?? new Date().toISOString(),
          }),
        )
      }
    }
    return {
      items: mergeStaffLibraryEntries(
        local,
        mergeStaffLibraryEntries(remote, fromSchedules),
      ),
      mode: 'table',
    }
  }
  if (table.error && !isMissingTableError(table.error)) {
    throw new Error(table.error.message)
  }

  const remote =
    (await fetchSystemBundleItems<StaffLibraryEntry>(
      SYS_STAFF_LIB_ID,
      'staff_library',
    )) ?? []
  return {
    items: mergeStaffLibraryEntries(local, remote),
    mode: 'bundle',
  }
}

export async function pushAllStaffLibraryRemote(
  entries: StaffLibraryEntry[],
): Promise<'table' | 'bundle' | 'local'> {
  if (!isSupabaseConfigured()) return 'local'
  const sb = getSupabase()
  if (!sb) return 'local'

  const rows = entries
    .filter((e) => e.name.trim() && e.unitName.trim())
    .map(staffEntryToRow)
  if (rows.length === 0) return 'table'

  const { error } = await sb.from('staff_library').upsert(rows, {
    onConflict: 'id',
  })
  if (!error) return 'table'
  if (!isMissingTableError(error)) throw new Error(error.message)

  await upsertSystemBundle(
    SYS_STAFF_LIB_ID,
    SYS_STAFF_LIB_UNIT,
    'staff_library',
    entries,
  )
  return 'bundle'
}
