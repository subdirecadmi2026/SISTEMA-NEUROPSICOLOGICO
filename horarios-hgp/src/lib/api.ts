import type { AppUser, ScheduleDoc } from '../types'
import { getSupabase, isSupabaseConfigured } from './supabase'
import { appendAudit } from './auth'
import { saveSchedule } from './storage'

export function isRemoteEnabled(): boolean {
  return isSupabaseConfigured()
}

/** Persiste horario en Supabase (si está configurado). Siempre se guarda local primero. */
export async function persistSchedule(
  doc: ScheduleDoc,
  user: AppUser | null,
): Promise<ScheduleDoc> {
  const local = saveSchedule(
    appendAudit(doc, user, 'guardar', 'Persistencia local'),
  )

  const sb = getSupabase()
  if (!sb) return local

  const { error: upsertErr } = await sb.from('schedules').upsert(
    {
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
    },
    { onConflict: 'id' },
  )
  if (upsertErr) throw new Error(upsertErr.message)

  // Celdas: reemplazo simple por schedule_id
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

  // Auditoría remota
  const last = local.audit.at(-1)
  if (last) {
    await sb.from('audit_log').insert({
      id: last.id,
      schedule_id: local.id,
      at: last.at,
      user_id: last.userId ?? null,
      user_name: last.userName,
      action: last.action,
      detail: last.detail ?? null,
    })
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
  return (data?.payload as ScheduleDoc) ?? null
}

export async function listRemoteSchedules(): Promise<
  Array<{ id: string; unit_name: string; month: number; year: number; status: string }>
> {
  const sb = getSupabase()
  if (!sb) return []
  const { data, error } = await sb
    .from('schedules')
    .select('id, unit_name, month, year, status')
    .order('updated_at', { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  return data ?? []
}
