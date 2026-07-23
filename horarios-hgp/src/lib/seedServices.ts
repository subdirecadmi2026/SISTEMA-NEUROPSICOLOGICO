import { getSupabase, isSupabaseConfigured } from './supabase'
import { UNITS_ENFERMERIA, UNITS_MEDICO } from '../data/templates'

/** Inserta especialidades/servicios base si la tabla está vacía. */
export async function seedServicesIfEmpty(): Promise<number> {
  if (!isSupabaseConfigured()) return 0
  const sb = getSupabase()
  if (!sb) return 0

  const { count, error } = await sb
    .from('services')
    .select('*', { count: 'exact', head: true })
  if (error) throw new Error(error.message)
  if ((count ?? 0) > 0) return 0

  const rows = [
    ...UNITS_ENFERMERIA.map((name) => ({
      name,
      service_type: 'enfermeria' as const,
      leader_name: null,
    })),
    ...UNITS_MEDICO.map((name) => ({
      name,
      service_type: 'medico' as const,
      leader_name: null,
    })),
  ]

  const { error: insErr } = await sb.from('services').insert(rows)
  if (insErr) throw new Error(insErr.message)
  return rows.length
}
