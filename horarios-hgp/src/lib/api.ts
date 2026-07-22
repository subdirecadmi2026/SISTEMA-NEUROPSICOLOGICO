import type { AppUser, ScheduleDoc, SavedIndexItem, ServiceType } from '../types'
import { STATUS_LABEL } from '../types'
import { getSupabase, isSupabaseConfigured } from './supabase'
import { appendAudit } from './auth'
import { saveSchedule, listSavedSchedules, loadSchedule } from './storage'

export function isRemoteEnabled(): boolean {
  return isSupabaseConfigured()
}

function toIndexItem(doc: ScheduleDoc): SavedIndexItem {
  return {
    id: doc.id,
    label: `${doc.serviceType === 'enfermeria' ? 'Enf' : 'Med'} · ${doc.unitName} · ${doc.month}/${doc.year}`,
    serviceType: doc.serviceType,
    unitName: doc.unitName,
    month: doc.month,
    year: doc.year,
    updatedAt: doc.updatedAt,
    status: doc.status,
  }
}

function migratePayload(raw: ScheduleDoc): ScheduleDoc {
  return {
    ...raw,
    status: raw.status ?? 'BORRADOR',
    version: raw.version ?? 1,
    signatures: raw.signatures ?? [],
    audit: raw.audit ?? [],
    coverageRule: raw.coverageRule ?? {
      minStaffPerDay: 2,
      minHoursPerDay: 16,
    },
    staff: raw.staff ?? [],
    cells: raw.cells ?? {},
    contingencyStaff: raw.contingencyStaff ?? [],
  }
}

/** Persiste horario en Supabase (si está configurado). Siempre se guarda local primero. */
export async function persistSchedule(
  doc: ScheduleDoc,
  user: AppUser | null,
): Promise<ScheduleDoc> {
  let working = appendAudit(doc, user, 'guardar', 'Persistencia')

  const sb = getSupabase()
  if (sb) {
    // Reutilizar el id del mismo período si ya existe en servidor
    // (constraint unique service_type + unit_name + year + month)
    const { data: existing } = await sb
      .from('schedules')
      .select('id')
      .eq('service_type', working.serviceType)
      .eq('unit_name', working.unitName)
      .eq('year', working.year)
      .eq('month', working.month)
      .maybeSingle()

    if (existing?.id && existing.id !== working.id) {
      working = { ...working, id: existing.id as string }
    }
  }

  const local = saveSchedule(working)

  if (!sb) return local

  const row = {
    id: local.id,
    hospital: local.hospital,
    provincial: local.provincial,
    service_type: local.serviceType,
    department: local.department,
    unit_name: local.unitName,
    jefe_servicio: local.jefeServicio,
    month: local.month,
    year: local.year,
    notes: local.notes,
    contingency_plan: local.contingencyPlan,
    llamado: local.llamado,
    vacaciones_flag: local.vacacionesFlag,
    elaborado_por: local.elaboradoPor,
    revisado_por: local.revisadoPor,
    aprobado_por: local.aprobadoPor,
    talento_humano: local.talentoHumano,
    status: local.status,
    version: local.version,
    coverage_rule: local.coverageRule,
    payload: local,
    updated_at: local.updatedAt,
    created_by: user?.id ?? local.createdBy ?? null,
  }

  const { error: upsertErr } = await sb
    .from('schedules')
    .upsert(row, { onConflict: 'id' })
  if (upsertErr) throw new Error(upsertErr.message)

  await sb.from('schedule_cells').delete().eq('schedule_id', local.id)
  const cellRows = Object.entries(local.cells).map(([key, code]) => {
    const [staffId, day] = key.split(':')
    return {
      schedule_id: local.id,
      staff_id: staffId,
      day: Number(day),
      code,
    }
  })
  if (cellRows.length > 0) {
    const { error } = await sb.from('schedule_cells').insert(cellRows)
    if (error) throw new Error(error.message)
  }

  // Staff snapshot en tabla staff (por id)
  for (const s of local.staff) {
    await sb.from('staff').upsert(
      {
        id: s.id,
        fun: s.fun,
        name: s.name,
        role: s.role,
        relacion_laboral: s.relacionLaboral,
        codigo_personal: s.codigoPersonal,
        section: s.section ?? null,
        service_unit: local.unitName,
        active: s.active !== false,
        sort_order: s.order,
      },
      { onConflict: 'id' },
    )
  }

  const last = local.audit.at(-1)
  if (last) {
    await sb.from('audit_log').upsert(
      {
        id: last.id,
        schedule_id: local.id,
        at: last.at,
        user_id: last.userId ?? null,
        user_name: last.userName,
        action: last.action,
        detail: last.detail ?? null,
      },
      { onConflict: 'id' },
    )
  }

  return local
}

export async function fetchRemoteSchedule(
  id: string,
): Promise<ScheduleDoc | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from('schedules')
    .select('payload')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.payload) return null
  const doc = migratePayload(data.payload as ScheduleDoc)
  saveSchedule(doc) // cache local
  return doc
}

export async function listRemoteSchedules(): Promise<SavedIndexItem[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data, error } = await sb
    .from('schedules')
    .select(
      'id, service_type, unit_name, month, year, status, updated_at, payload',
    )
    .order('updated_at', { ascending: false })
    .limit(80)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => {
    const st = (r.service_type as ServiceType) ?? 'medico'
    return {
      id: r.id as string,
      label: `${st === 'enfermeria' ? 'Enf' : 'Med'} · ${r.unit_name} · ${r.month}/${r.year}`,
      serviceType: st,
      unitName: r.unit_name as string,
      month: r.month as number,
      year: r.year as number,
      updatedAt: (r.updated_at as string) ?? new Date().toISOString(),
      status: r.status as SavedIndexItem['status'],
    }
  })
}

/** Une local + remoto (remoto gana si mismo id). */
export async function listAllSchedules(): Promise<SavedIndexItem[]> {
  const local = listSavedSchedules()
  if (!isRemoteEnabled()) return local
  try {
    const remote = await listRemoteSchedules()
    const map = new Map<string, SavedIndexItem>()
    for (const item of local) map.set(item.id, item)
    for (const item of remote) map.set(item.id, item)
    return [...map.values()].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    )
  } catch {
    return local
  }
}

export async function loadAnySchedule(id: string): Promise<ScheduleDoc | null> {
  if (isRemoteEnabled()) {
    try {
      const remote = await fetchRemoteSchedule(id)
      if (remote) return remote
    } catch {
      // fallback local
    }
  }
  return loadSchedule(id)
}

/** Elimina horario del servidor (y deja que el caller limpie local). */
export async function deleteRemoteSchedule(id: string): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  await sb.from('schedule_cells').delete().eq('schedule_id', id)
  await sb.from('audit_log').delete().eq('schedule_id', id)
  await sb.from('approvals').delete().eq('schedule_id', id)
  await sb.from('contingency').delete().eq('schedule_id', id)
  const { error } = await sb.from('schedules').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export function statusBadge(status: SavedIndexItem['status']): string {
  return status ? STATUS_LABEL[status] : '—'
}

export { toIndexItem }
