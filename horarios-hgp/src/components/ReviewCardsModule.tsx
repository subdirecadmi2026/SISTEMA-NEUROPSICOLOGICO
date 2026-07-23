import { useEffect, useMemo, useState } from 'react'
import type { AppUser, SavedIndexItem, ScheduleDoc } from '../types'
import { MONTHS_ES, STATUS_LABEL } from '../types'
import {
  isRevisorRole,
  isValidadorRole,
  roleLabel,
  transitionStatus,
} from '../lib/auth'
import { loadAnySchedule } from '../lib/api'
import { ScheduleTable } from './ScheduleTable'
import { MonthSummary } from './MonthSummary'
import { runAllValidations } from '../lib/validation'
import { SERVICE_LABEL } from '../data/templates'

type Mode = 'revisor' | 'validador'

type Props = {
  mode: Mode
  user: AppUser
  items: SavedIndexItem[]
  loading?: boolean
  onRefresh: () => void
  onChanged: (doc: ScheduleDoc) => void
  onFlash: (msg: string) => void
}

function targetStatus(mode: Mode): ScheduleDoc['status'] {
  return mode === 'revisor' ? 'EN_REVISION' : 'APROBADO'
}

/**
 * Módulo exclusivo de revisión/validación:
 * solo tarjetas + vista de un horario a la vez (sin herramientas de edición).
 */
export function ReviewCardsModule({
  mode,
  user,
  items,
  loading,
  onRefresh,
  onChanged,
  onFlash,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ScheduleDoc | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [correction, setCorrection] = useState('')
  const [filter, setFilter] = useState('')

  const pending = useMemo(() => {
    const st = targetStatus(mode)
    const needle = filter.trim().toLowerCase()
    return items
      .filter((i) => i.status === st)
      .filter((i) => {
        if (!needle) return true
        return `${i.unitName} ${MONTHS_ES[i.month - 1]} ${i.year}`
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [items, mode, filter])

  useEffect(() => {
    // Si el detalle ya no está pendiente, volver a tarjetas
    if (!detail) return
    const still = items.find((i) => i.id === detail.id)
    if (still && still.status !== targetStatus(mode)) {
      setDetail(null)
      setSelectedId(null)
      setCorrection('')
    }
  }, [items, detail, mode])

  async function openCard(id: string) {
    setLoadingDetail(true)
    setSelectedId(id)
    try {
      const doc = await loadAnySchedule(id)
      if (!doc) {
        onFlash('No se pudo abrir el horario')
        setSelectedId(null)
        return
      }
      setDetail(doc)
      setCorrection('')
    } catch (e) {
      onFlash(e instanceof Error ? e.message : 'Error al abrir')
      setSelectedId(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  function backToCards() {
    setDetail(null)
    setSelectedId(null)
    setCorrection('')
  }

  function applyTransition(next: ScheduleDoc['status'], comment?: string) {
    if (!detail) return
    const res = transitionStatus(detail, next, user, { comment })
    if (!res.ok) {
      onFlash(res.error)
      return
    }
    onChanged(res.doc)
    onFlash(`Estado: ${STATUS_LABEL[next]}`)
    backToCards()
    onRefresh()
  }

  const title =
    mode === 'revisor' ? 'Revisión de horarios' : 'Validación de horarios'
  const subtitle =
    mode === 'revisor'
      ? 'Visualice cada horario y apruebe o deje un comentario de corrección'
      : 'Visualice cada horario aprobado y confírmelo como validado'

  // ——— Detalle uno a uno ———
  if (detail) {
    const alerts = runAllValidations(detail)
    const errors = alerts.filter((a) => a.level === 'error').length
    return (
      <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-6 sm:py-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={backToCards}
              className="mb-2 text-sm font-semibold text-navy underline"
            >
              ← Volver a tarjetas
            </button>
            <h1 className="font-display text-2xl text-navy">
              {detail.unitName}
            </h1>
            <p className="text-sm text-muted">
              {SERVICE_LABEL[detail.serviceType]} ·{' '}
              {MONTHS_ES[detail.month - 1]} {detail.year} ·{' '}
              <strong>{STATUS_LABEL[detail.status]}</strong>
              {detail.jefeServicio ? ` · Jefe: ${detail.jefeServicio}` : ''}
            </p>
          </div>
          <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold text-muted">
            {roleLabel(user.role)} · solo lectura
          </span>
        </div>

        <MonthSummary doc={detail} />

        {errors > 0 && (
          <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Este horario tiene {errors} alerta(s) de cobertura/validación. Revise
            la grilla antes de decidir.
          </p>
        )}

        <div className="mb-4 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          <ScheduleTable
            doc={detail}
            readOnly
            paintMode={false}
            activeCode=""
            compact
            onChange={() => {
              /* solo lectura */
            }}
            onAddStaff={() => undefined}
            onNewDemo={() => undefined}
          />
        </div>

        {mode === 'revisor' && (
          <section className="mb-4 rounded-2xl border border-violet-200 bg-violet-50/80 p-4">
            <h2 className="font-display text-lg text-navy">Su decisión</h2>
            <p className="mb-3 text-sm text-muted">
              Apruebe el horario o devuélvalo al jefe con un comentario claro.
            </p>
            <textarea
              className="mb-3 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
              rows={3}
              placeholder="Comentario de corrección (obligatorio al devolver)…"
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyTransition('APROBADO')}
                className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-deep"
              >
                Aprobar
              </button>
              <button
                type="button"
                onClick={() => applyTransition('BORRADOR', correction)}
                className="rounded-xl border border-amber-700 bg-white px-4 py-2.5 text-sm font-semibold text-amber-950 hover:bg-amber-100"
              >
                Devolver con comentario
              </button>
            </div>
          </section>
        )}

        {mode === 'validador' && (
          <section className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
            <h2 className="font-display text-lg text-navy">Validar</h2>
            <p className="mb-3 text-sm text-muted">
              Confirme que el horario aprobado queda validado formalmente.
            </p>
            <button
              type="button"
              onClick={() => applyTransition('ARCHIVADO')}
              className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110"
            >
              Validar horario
            </button>
          </section>
        )}
      </div>
    )
  }

  // ——— Tarjetas ———
  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-6">
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          {mode === 'revisor' ? 'Módulo revisor' : 'Módulo validador'}
        </p>
        <h1 className="font-display text-3xl text-navy">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar servicio o mes…"
          className="min-w-[200px] flex-1 rounded-xl border border-line bg-white px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold hover:bg-sand"
        >
          Actualizar
        </button>
        <span className="rounded-full bg-navy px-3 py-1 text-xs font-bold text-white">
          {pending.length} pendiente{pending.length === 1 ? '' : 's'}
        </span>
      </div>

      {loading || loadingDetail ? (
        <p className="rounded-2xl border border-dashed border-line bg-white/70 px-4 py-10 text-center text-sm text-muted">
          Cargando…
        </p>
      ) : pending.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white/70 px-4 py-10 text-center text-sm text-muted">
          No hay horarios pendientes
          {mode === 'revisor' ? ' de revisión' : ' de validación'}.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {pending.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => void openCard(s.id)}
              className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-teal/50 hover:shadow ${
                selectedId === s.id
                  ? 'border-navy ring-2 ring-navy/20'
                  : 'border-line'
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                {s.serviceType === 'enfermeria' ? 'Enfermería' : 'Médico'}
              </p>
              <h2 className="font-display text-xl text-navy">{s.unitName}</h2>
              <p className="mt-1 text-sm text-ink">
                {MONTHS_ES[s.month - 1]} {s.year}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-950">
                  {s.status ? STATUS_LABEL[s.status] : '—'}
                </span>
                <span className="text-xs font-semibold text-navy">
                  Abrir →
                </span>
              </div>
              <p className="mt-2 text-[11px] text-muted">
                Actualizado{' '}
                {new Date(s.updatedAt).toLocaleString('es-EC', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function workspaceModeFor(
  user: AppUser | null,
): 'editor' | 'revisor' | 'validador' | 'login' {
  if (!user) return 'login'
  if (user.role === 'admin') return 'editor'
  if (user.role === 'lider_servicio') return 'editor'
  // Validador puro (no revisor)
  if (isValidadorRole(user.role) && !isRevisorRole(user.role)) return 'validador'
  if (isRevisorRole(user.role)) return 'revisor'
  if (isValidadorRole(user.role)) return 'validador'
  return 'editor'
}
