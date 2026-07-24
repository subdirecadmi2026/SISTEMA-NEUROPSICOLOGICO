/**
 * Sync de configuración de app (usuarios, unidades, firmas, claves, feriados)
 * hacia Supabase: tablas dedicadas si existen, o bundles en `schedules`.
 */
import type { ServiceType, ShiftCode, ScheduleDoc } from '../types'
import { DEFAULT_COVERAGE } from '../types'
import { getSupabase, isSupabaseConfigured } from './supabase'
import { saveSchedule } from './storage'
import type { ManagedUser } from './usersStore'
import type { SignersConfig } from './signersStore'
import type { Holiday } from './holidays'
import { UNITS_ENFERMERIA, UNITS_MEDICO } from '../data/templates'

export const SYS_USERS_ID = 'sys-hgp-app-users'
export const SYS_SIGNERS_ID = 'sys-hgp-signers'
export const SYS_SHIFTS_ID = 'sys-hgp-shifts'
export const SYS_HOLIDAYS_ID = 'sys-hgp-holidays'
export const SYS_UNITS_ID = 'sys-hgp-units'

export const SYS_USERS_UNIT = '__SYSTEM__/app_users'
export const SYS_SIGNERS_UNIT = '__SYSTEM__/signers'
export const SYS_SHIFTS_UNIT = '__SYSTEM__/shifts'
export const SYS_HOLIDAYS_UNIT = '__SYSTEM__/holidays'
export const SYS_UNITS_UNIT = '__SYSTEM__/units'

export type UnitsBlob = {
  enfermeria: string[]
  medico: string[]
}

export type UsersRemoteBlob = {
  custom: ManagedUser[]
  overrides: Record<string, Partial<ManagedUser>>
  deletedDemo: string[]
  updatedAt: string
}

export type ShiftsBlob = {
  enfermeria: ShiftCode[]
  medico: ShiftCode[]
  updatedAt?: string
}

export type HolidaysRemoteBlob = {
  custom: Holiday[]
  suppressed: string[]
  updatedAt: string
}

export type AppConfigSyncStatus = {
  configured: boolean
  usersMode: 'table' | 'bundle' | 'local' | 'unknown'
  unitsMode: 'table' | 'bundle' | 'local' | 'unknown'
  signersMode: 'table' | 'bundle' | 'local' | 'unknown'
  shiftsMode: 'table' | 'bundle' | 'local' | 'unknown'
  holidaysMode: 'table' | 'bundle' | 'local' | 'unknown'
  usersCount: number
  unitsCount: number
  signersCount: number
  shiftsCount: number
  holidaysCount: number
  lastError?: string
}

function isMissingTableError(
  err: { code?: string; message?: string } | null,
): boolean {
  if (!err) return false
  const msg = (err.message ?? '').toLowerCase()
  return (
    err.code === 'PGRST205' ||
    err.code === '42P01' ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist')
  )
}

function baseSystemDoc(id: string, unitName: string): ScheduleDoc {
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

async function upsertSystemBundle(
  id: string,
  unitName: string,
  kind: string,
  data: unknown,
): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  const base = baseSystemDoc(id, unitName)
  const payload = {
    ...base,
    systemKind: kind,
    systemData: data,
    updatedAt: new Date().toISOString(),
  }
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

async function fetchSystemBundleData<T>(
  id: string,
  kind: string,
): Promise<T | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from('schedules')
    .select('payload')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.payload) return null
  const payload = data.payload as {
    systemKind?: string
    systemData?: T
    systemItems?: T
  }
  if (payload.systemKind && payload.systemKind !== kind) return null
  if (payload.systemData != null) return payload.systemData
  if (payload.systemItems != null) return payload.systemItems as T
  return null
}

function mergeUnitLists(a: string[], b: string[]): string[] {
  const map = new Map<string, string>()
  for (const n of [...a, ...b]) {
    const t = n.trim()
    if (!t) continue
    const key = t.toLowerCase()
    if (!map.has(key)) map.set(key, t)
  }
  return [...map.values()].sort((x, y) => x.localeCompare(y, 'es'))
}

export async function pullUnitsRemote(local: UnitsBlob): Promise<{
  items: UnitsBlob
  mode: 'table' | 'bundle' | 'local'
}> {
  if (!isSupabaseConfigured()) return { items: local, mode: 'local' }
  const sb = getSupabase()
  if (!sb) return { items: local, mode: 'local' }

  const table = await sb.from('services').select('name,service_type').limit(2000)
  if (!table.error && table.data) {
    const enfermeria: string[] = []
    const medico: string[] = []
    for (const r of table.data) {
      const name = String(r.name ?? '').trim()
      if (!name) continue
      if (r.service_type === 'enfermeria') enfermeria.push(name)
      else if (r.service_type === 'medico') medico.push(name)
    }
    return {
      items: {
        enfermeria: mergeUnitLists(
          local.enfermeria.length ? local.enfermeria : [...UNITS_ENFERMERIA],
          enfermeria,
        ),
        medico: mergeUnitLists(
          local.medico.length ? local.medico : [...UNITS_MEDICO],
          medico,
        ),
      },
      mode: 'table',
    }
  }
  if (table.error && !isMissingTableError(table.error)) {
    throw new Error(table.error.message)
  }

  const remote = await fetchSystemBundleData<UnitsBlob>(SYS_UNITS_ID, 'units')
  if (!remote) return { items: local, mode: 'bundle' }
  return {
    items: {
      enfermeria: mergeUnitLists(local.enfermeria, remote.enfermeria ?? []),
      medico: mergeUnitLists(local.medico, remote.medico ?? []),
    },
    mode: 'bundle',
  }
}

export async function pushUnitsRemote(
  blob: UnitsBlob,
): Promise<'table' | 'bundle' | 'local'> {
  if (!isSupabaseConfigured()) return 'local'
  const sb = getSupabase()
  if (!sb) return 'local'

  const rows = [
    ...blob.enfermeria.map((name) => ({
      name,
      service_type: 'enfermeria' as const,
      leader_name: null as string | null,
    })),
    ...blob.medico.map((name) => ({
      name,
      service_type: 'medico' as const,
      leader_name: null as string | null,
    })),
  ]
  const { error } = await sb
    .from('services')
    .upsert(rows, { onConflict: 'name,service_type' })
  if (!error) return 'table'

  await upsertSystemBundle(SYS_UNITS_ID, SYS_UNITS_UNIT, 'units', blob)
  if (!isMissingTableError(error)) {
    // services exists but upsert failed (p.ej. conflicto) — bundle como respaldo
    return 'bundle'
  }
  return 'bundle'
}

export async function pullUsersRemote(local: UsersRemoteBlob): Promise<{
  items: UsersRemoteBlob
  mode: 'table' | 'bundle' | 'local'
}> {
  if (!isSupabaseConfigured()) return { items: local, mode: 'local' }
  const sb = getSupabase()
  if (!sb) return { items: local, mode: 'local' }

  const table = await sb.from('hgp_app_users').select('*').limit(2000)
  if (!table.error && table.data) {
    const custom: ManagedUser[] = []
    const overrides: Record<string, Partial<ManagedUser>> = {
      ...local.overrides,
    }
    const deletedDemo = new Set(local.deletedDemo)
    for (const r of table.data) {
      const row = r as Record<string, unknown>
      const user: ManagedUser = {
        id: String(row.id),
        email: String(row.email),
        name: String(row.name),
        role: row.role as ManagedUser['role'],
        serviceUnits: Array.isArray(row.service_units)
          ? (row.service_units as string[])
          : [],
        password: row.password ? String(row.password) : undefined,
        active: row.active !== false,
        source: row.source === 'demo' ? 'demo' : 'custom',
        createdAt: String(row.created_at ?? new Date().toISOString()),
        updatedAt: String(row.updated_at ?? new Date().toISOString()),
      }
      if (row.deleted_demo === true) {
        deletedDemo.add(user.id)
        continue
      }
      if (user.source === 'demo') {
        overrides[user.id] = {
          ...overrides[user.id],
          email: user.email,
          name: user.name,
          role: user.role,
          serviceUnits: user.serviceUnits,
          password: user.password,
          active: user.active,
          updatedAt: user.updatedAt,
          createdAt: user.createdAt,
          source: 'demo',
          id: user.id,
        }
      } else {
        custom.push(user)
      }
    }
    const byId = new Map(custom.map((u) => [u.id, u]))
    for (const u of local.custom) {
      if (!byId.has(u.id)) byId.set(u.id, u)
    }
    return {
      items: {
        custom: [...byId.values()],
        overrides,
        deletedDemo: [...deletedDemo],
        updatedAt: new Date().toISOString(),
      },
      mode: 'table',
    }
  }
  if (table.error && !isMissingTableError(table.error)) {
    throw new Error(table.error.message)
  }

  const remote = await fetchSystemBundleData<UsersRemoteBlob>(
    SYS_USERS_ID,
    'app_users',
  )
  if (!remote) return { items: local, mode: 'bundle' }
  return {
    items: {
      custom: (() => {
        const m = new Map<string, ManagedUser>()
        for (const u of [...local.custom, ...(remote.custom ?? [])]) {
          const prev = m.get(u.id)
          if (!prev || (u.updatedAt ?? '') >= (prev.updatedAt ?? '')) {
            m.set(u.id, u)
          }
        }
        return [...m.values()]
      })(),
      overrides: { ...local.overrides, ...(remote.overrides ?? {}) },
      deletedDemo: [
        ...new Set([...local.deletedDemo, ...(remote.deletedDemo ?? [])]),
      ],
      updatedAt: new Date().toISOString(),
    },
    mode: 'bundle',
  }
}

export async function pushUsersRemote(
  blob: UsersRemoteBlob,
): Promise<'table' | 'bundle' | 'local'> {
  if (!isSupabaseConfigured()) return 'local'
  const sb = getSupabase()
  if (!sb) return 'local'

  const rows: Array<Record<string, unknown>> = []
  for (const u of blob.custom) {
    rows.push({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      service_units: u.serviceUnits,
      password: u.password ?? null,
      active: u.active !== false,
      source: 'custom',
      deleted_demo: false,
      created_at: u.createdAt,
      updated_at: u.updatedAt,
    })
  }
  for (const [id, ov] of Object.entries(blob.overrides)) {
    rows.push({
      id,
      email: ov.email ?? `${id}@hgp.gob.ec`,
      name: ov.name ?? id,
      role: ov.role ?? 'lider_servicio',
      service_units: ov.serviceUnits ?? [],
      password: ov.password ?? null,
      active: ov.active !== false,
      source: 'demo',
      deleted_demo: blob.deletedDemo.includes(id),
      created_at: ov.createdAt ?? new Date().toISOString(),
      updated_at: ov.updatedAt ?? new Date().toISOString(),
    })
  }
  for (const id of blob.deletedDemo) {
    if (rows.some((r) => r.id === id)) continue
    rows.push({
      id,
      email: `deleted-${id}@hgp.gob.ec`,
      name: id,
      role: 'lider_servicio',
      service_units: [],
      password: null,
      active: false,
      source: 'demo',
      deleted_demo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  if (rows.length > 0) {
    const { error } = await sb
      .from('hgp_app_users')
      .upsert(rows, { onConflict: 'id' })
    if (!error) return 'table'
    if (!isMissingTableError(error)) throw new Error(error.message)
  }

  await upsertSystemBundle(SYS_USERS_ID, SYS_USERS_UNIT, 'app_users', {
    ...blob,
    updatedAt: new Date().toISOString(),
  })
  return 'bundle'
}

export async function pullSignersRemote(local: SignersConfig): Promise<{
  items: SignersConfig
  mode: 'table' | 'bundle' | 'local'
}> {
  if (!isSupabaseConfigured()) return { items: local, mode: 'local' }
  const sb = getSupabase()
  if (!sb) return { items: local, mode: 'local' }

  const table = await sb.from('hospital_signers').select('*').limit(100)
  if (!table.error && table.data && table.data.length > 0) {
    const meta = await sb
      .from('hospital_signers_meta')
      .select('*')
      .eq('id', 'default')
      .maybeSingle()
    const signers = table.data.map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: String(row.id),
        nombres: String(row.nombres ?? ''),
        apellidos: String(row.apellidos ?? ''),
        cargo: String(row.cargo ?? ''),
        kind: row.kind as SignersConfig['signers'][number]['kind'],
        email: String(row.email ?? ''),
        linkedUserId: row.linked_user_id
          ? String(row.linked_user_id)
          : undefined,
        order: Number(row.sort_order) || 1,
        active: row.active !== false,
      }
    })
    return {
      items: {
        count:
          Number(meta.data?.total_count) || Math.min(1 + signers.length, 7),
        signers,
      },
      mode: 'table',
    }
  }
  if (table.error && !isMissingTableError(table.error)) {
    throw new Error(table.error.message)
  }

  const remote = await fetchSystemBundleData<SignersConfig>(
    SYS_SIGNERS_ID,
    'signers',
  )
  return { items: remote ?? local, mode: 'bundle' }
}

export async function pushSignersRemote(
  cfg: SignersConfig,
): Promise<'table' | 'bundle' | 'local'> {
  if (!isSupabaseConfigured()) return 'local'
  const sb = getSupabase()
  if (!sb) return 'local'

  const rows = cfg.signers.map((s) => ({
    id: s.id,
    nombres: s.nombres,
    apellidos: s.apellidos,
    cargo: s.cargo,
    kind: s.kind,
    email: s.email,
    linked_user_id: s.linkedUserId ?? null,
    sort_order: s.order,
    active: s.active,
    updated_at: new Date().toISOString(),
  }))
  const { error } = await sb
    .from('hospital_signers')
    .upsert(rows, { onConflict: 'id' })
  if (!error) {
    await sb.from('hospital_signers_meta').upsert(
      {
        id: 'default',
        total_count: cfg.count,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    return 'table'
  }
  if (!isMissingTableError(error)) throw new Error(error.message)
  await upsertSystemBundle(SYS_SIGNERS_ID, SYS_SIGNERS_UNIT, 'signers', cfg)
  return 'bundle'
}

export async function pullShiftsRemote(local: ShiftsBlob): Promise<{
  items: ShiftsBlob
  mode: 'table' | 'bundle' | 'local'
}> {
  if (!isSupabaseConfigured()) return { items: local, mode: 'local' }
  const sb = getSupabase()
  if (!sb) return { items: local, mode: 'local' }

  const table = await sb.from('shift_codes').select('*').limit(2000)
  if (!table.error && table.data && table.data.length > 0) {
    const enfermeria: ShiftCode[] = []
    const medico: ShiftCode[] = []
    for (const r of table.data) {
      const row = r as Record<string, unknown>
      const shift: ShiftCode = {
        code: String(row.code),
        label: String(row.label),
        hours: Number(row.hours) || 0,
        timeRange: row.time_range ? String(row.time_range) : undefined,
        note: row.note ? String(row.note) : undefined,
        color: row.color ? String(row.color) : '#e8eef5',
        text: row.text_color ? String(row.text_color) : '#1c3a5c',
        group:
          (String(row.code_group || 'turno') as ShiftCode['group']) || 'turno',
      }
      if (row.service_type === 'enfermeria') enfermeria.push(shift)
      else medico.push(shift)
    }
    return {
      items: {
        enfermeria: enfermeria.length ? enfermeria : local.enfermeria,
        medico: medico.length ? medico : local.medico,
      },
      mode: 'table',
    }
  }
  if (table.error && !isMissingTableError(table.error)) {
    throw new Error(table.error.message)
  }

  const remote = await fetchSystemBundleData<ShiftsBlob>(SYS_SHIFTS_ID, 'shifts')
  return { items: remote ?? local, mode: 'bundle' }
}

export async function pushShiftsRemote(
  blob: ShiftsBlob,
): Promise<'table' | 'bundle' | 'local'> {
  if (!isSupabaseConfigured()) return 'local'
  const sb = getSupabase()
  if (!sb) return 'local'

  const toRows = (service: ServiceType, list: ShiftCode[]) =>
    list.map((s) => ({
      id: `${service}:${s.code.toUpperCase()}`,
      service_type: service,
      code: s.code.toUpperCase(),
      label: s.label,
      hours: s.hours,
      time_range: s.timeRange ?? null,
      note: s.note ?? null,
      color: s.color ?? null,
      text_color: s.text ?? null,
      code_group: s.group,
      updated_at: new Date().toISOString(),
    }))

  const rows = [
    ...toRows('enfermeria', blob.enfermeria),
    ...toRows('medico', blob.medico),
  ]
  const { error } = await sb
    .from('shift_codes')
    .upsert(rows, { onConflict: 'id' })
  if (!error) return 'table'
  if (!isMissingTableError(error)) throw new Error(error.message)
  await upsertSystemBundle(SYS_SHIFTS_ID, SYS_SHIFTS_UNIT, 'shifts', {
    ...blob,
    updatedAt: new Date().toISOString(),
  })
  return 'bundle'
}

export async function pullHolidaysRemote(local: HolidaysRemoteBlob): Promise<{
  items: HolidaysRemoteBlob
  mode: 'table' | 'bundle' | 'local'
}> {
  if (!isSupabaseConfigured()) return { items: local, mode: 'local' }
  const sb = getSupabase()
  if (!sb) return { items: local, mode: 'local' }

  const table = await sb.from('holiday_overrides').select('*').limit(5000)
  if (!table.error && table.data) {
    const custom: Holiday[] = []
    const suppressed: string[] = []
    for (const r of table.data) {
      const row = r as Record<string, unknown>
      const date = String(row.date)
      const kind = String(row.kind ?? 'custom')
      if (kind === 'suppressed') suppressed.push(date)
      else {
        custom.push({
          date,
          name: String(row.name),
          editable: true,
          source: 'custom',
        })
      }
    }
    const customMap = new Map(custom.map((h) => [h.date, h]))
    for (const h of local.custom) {
      if (!customMap.has(h.date)) customMap.set(h.date, h)
    }
    return {
      items: {
        custom: [...customMap.values()],
        suppressed: [...new Set([...suppressed, ...local.suppressed])],
        updatedAt: new Date().toISOString(),
      },
      mode: 'table',
    }
  }
  if (table.error && !isMissingTableError(table.error)) {
    throw new Error(table.error.message)
  }

  const remote = await fetchSystemBundleData<HolidaysRemoteBlob>(
    SYS_HOLIDAYS_ID,
    'holidays',
  )
  return { items: remote ?? local, mode: 'bundle' }
}

export async function pushHolidaysRemote(
  blob: HolidaysRemoteBlob,
): Promise<'table' | 'bundle' | 'local'> {
  if (!isSupabaseConfigured()) return 'local'
  const sb = getSupabase()
  if (!sb) return 'local'

  const rows = [
    ...blob.custom.map((h) => ({
      date: h.date,
      name: h.name,
      kind: 'custom',
      updated_at: new Date().toISOString(),
    })),
    ...blob.suppressed.map((date) => ({
      date,
      name: 'oculto',
      kind: 'suppressed',
      updated_at: new Date().toISOString(),
    })),
  ]
  if (rows.length > 0) {
    const { error } = await sb
      .from('holiday_overrides')
      .upsert(rows, { onConflict: 'date' })
    if (!error) return 'table'
    if (!isMissingTableError(error)) throw new Error(error.message)
  }

  await upsertSystemBundle(SYS_HOLIDAYS_ID, SYS_HOLIDAYS_UNIT, 'holidays', {
    ...blob,
    updatedAt: new Date().toISOString(),
  })
  return 'bundle'
}

export async function probeAppConfigRemote(): Promise<AppConfigSyncStatus> {
  const status: AppConfigSyncStatus = {
    configured: isSupabaseConfigured(),
    usersMode: 'unknown',
    unitsMode: 'unknown',
    signersMode: 'unknown',
    shiftsMode: 'unknown',
    holidaysMode: 'unknown',
    usersCount: 0,
    unitsCount: 0,
    signersCount: 0,
    shiftsCount: 0,
    holidaysCount: 0,
  }
  if (!status.configured) {
    status.usersMode = 'local'
    status.unitsMode = 'local'
    status.signersMode = 'local'
    status.shiftsMode = 'local'
    status.holidaysMode = 'local'
    return status
  }
  const sb = getSupabase()
  if (!sb) return status

  async function modeFor(
    table: string,
    bundleId: string,
  ): Promise<'table' | 'bundle' | 'local'> {
    const t = await sb!.from(table).select('*', { count: 'exact', head: true })
    if (!t.error) return 'table'
    const b = await sb!
      .from('schedules')
      .select('id')
      .eq('id', bundleId)
      .maybeSingle()
    return b.data ? 'bundle' : 'bundle'
  }

  try {
    status.usersMode = await modeFor('hgp_app_users', SYS_USERS_ID)
    status.unitsMode = await modeFor('services', SYS_UNITS_ID)
    status.signersMode = await modeFor('hospital_signers', SYS_SIGNERS_ID)
    status.shiftsMode = await modeFor('shift_codes', SYS_SHIFTS_ID)
    status.holidaysMode = await modeFor('holiday_overrides', SYS_HOLIDAYS_ID)
  } catch (e) {
    status.lastError = e instanceof Error ? e.message : 'Error probe config'
  }
  return status
}
