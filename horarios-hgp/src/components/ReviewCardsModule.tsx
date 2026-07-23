import { useMemo, useState } from 'react'
import type { AppUser, SavedIndexItem, ScheduleDoc } from '../types'
import { MONTHS_ES, STATUS_LABEL } from '../types'
import {
  isRevisorRole,
  isValidadorRole,
  roleLabel,
  transitionStatus,
} from '../lib/auth'
import { loadAnySchedule } from '../lib/api'
import { notifyJefeScheduleValidated } from '../lib/notifications'
import { ScheduleTable } from './ScheduleTable'
import { MonthSummary } from './MonthSummary'
import { runAllValidations } from '../lib/validation'
import { SERVICE_LABEL } from '../data/templates'
import { SignatureGate } from './SignatureGate'
import { slotForStatus } from '../lib/firmaEc'

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
 * Módulo exclusivo: tarjetas → abrir uno → ver / comentar o validar.
 * Sin herramientas de elaboración.
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
  const [signNext, setSignNext] = useState<ScheduleDoc['status'] | null>(null)

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
      window.scrollTo({ top: 0, behavior: 'smooth' })
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

  function nextPendingId(afterId: string): string | null {
    const idx = pending.findIndex((p) => p.id === afterId)
    if (idx < 0) return pending[0]?.id ?? null
    return pending[idx + 1]?.id ?? pending[0]?.id ?? null
  }

  function applyTransition(
    next: ScheduleDoc['status'],
    opts?: {
      comment?: string
      signedName?: string
      electronic?: import('../types').ElectronicSignRecord
    },
  ) {
    if (!detail) return
    const currentId = detail.id
    const queue = pending.filter((p) => p.id !== currentId)
    const res = transitionStatus(detail, next, user, opts)
    if (!res.ok) {
      onFlash(res.error)
      return
    }
    if (next === 'ARCHIVADO') {
      notifyJefeScheduleValidated(
        res.doc,
        opts?.signedName?.trim() || user.name,
      )
    }
    onChanged(res.doc)
    const elec = opts?.electronic ? ' (FirmaEC)' : ''
    onFlash(
      next === 'APROBADO'
        ? `Firmado y aprobado${elec} · ${opts?.signedName || user.name}`
        : next === 'ARCHIVADO'
          ? `Firmado y validado${elec} · aviso al jefe`
          : `Estado: ${STATUS_LABEL[next]}`,
    )
    setCorrection('')
    setSignNext(null)
    onRefresh()
    if (queue.length > 0) {
      void openCard(queue[0].id)
    } else {
      backToCards()
    }
  }

  const title =
    mode === 'revisor' ? 'Revisión de horarios' : 'Validación de horarios'
  const subtitle =
    mode === 'revisor'
      ? 'Abra una tarjeta, revise el horario y apruebe o deje un comentario'
      : 'Abra una tarjeta y valide el horario aprobado'

  if (detail) {
    const alerts = runAllValidations(detail)
    const errors = alerts.filter((a) => a.level === 'error').length
    const others = pending.filter((p) => p.id !== detail.id).length

    return (
      <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-6 sm:py-6">
        <SignatureGate
          open={!!signNext}
          title={
            signNext === 'APROBADO'
              ? 'Firmar y aprobar (Revisor)'
              : 'Firmar y validar'
          }
          subtitle="Puede firmar con nombre o electrónicamente con FirmaEC (.p12)."
          defaultName={user.name}
          confirmLabel={
            signNext === 'APROBADO' ? 'Firmar y aprobar' : 'Firmar y validar'
          }
          slot={
            signNext === 'APROBADO' || signNext === 'ARCHIVADO'
              ? slotForStatus(signNext)
              : 'revisor'
          }
          user={user}
          onCancel={() => setSignNext(null)}
          onConfirm={(result) => {
            if (!signNext) return
            applyTransition(signNext, {
              signedName: result.signedName,
              electronic: result.electronic,
            })
          }}
        />
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={backToCards}
              className="mb-2 text-sm font-semibold text-navy underline"
            >
              ← Volver a tarjetas ({pending.length})
            </button>
            <h1 className="font-display text-2xl text-navy sm:text-3xl">
              {detail.unitName}
            </h1>
            <p className="text-sm text-muted">
              {SERVICE_LABEL[detail.serviceType]} ·{' '}
              {MONTHS_ES[detail.month - 1]} {detail.year} ·{' '}
              <strong>{STATUS_LABEL[detail.status]}</strong>
              {detail.jefeServicio ? ` · Jefe: ${detail.jefeServicio}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold text-muted">
              {roleLabel(user.role)} · solo lectura
            </span>
            {others > 0 && (
              <button
                type="button"
                onClick={() => {
                  const nxt = nextPendingId(detail.id)
                  if (nxt) void openCard(nxt)
                }}
                className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:bg-sand"
              >
                Siguiente pendiente →
              </button>
            )}
          </div>
        </div>

        {/* Decisión primero: no hace falta bajar toda la grilla */}
        {mode === 'revisor' && (
          <section className="mb-4 rounded-2xl border-2 border-violet-300 bg-violet-50 p-4 shadow-sm">
            <h2 className="font-display text-lg text-navy">Su decisión</h2>
            <p className="mb-3 text-sm text-muted">
              Revise la grilla abajo. Luego apruebe o devuelva con un comentario
              claro para el jefe.
            </p>
            <textarea
              className="mb-3 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
              rows={3}
              placeholder="Ej.: Día 12 sin cobertura nocturna; complete N1…"
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSignNext('APROBADO')}
                className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-deep"
              >
                Firmar y aprobar
              </button>
              <button
                type="button"
                onClick={() => applyTransition('BORRADOR', { comment: correction })}
                className="rounded-xl border border-amber-700 bg-white px-4 py-2.5 text-sm font-semibold text-amber-950 hover:bg-amber-100"
              >
                Devolver con comentario
              </button>
            </div>
          </section>
        )}

        {mode === 'validador' && (
          <section className="mb-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 shadow-sm">
            <h2 className="font-display text-lg text-navy">Validar</h2>
            <p className="mb-3 text-sm text-muted">
              Firme y valide formalmente. Se avisará al jefe de servicio.
            </p>
            <button
              type="button"
              onClick={() => setSignNext('ARCHIVADO')}
              className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110"
            >
              Firmar y validar
            </button>
          </section>
        )}

        <MonthSummary doc={detail} />

        {errors > 0 && (
          <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {errors} alerta(s) de cobertura/validación en este mes.
          </p>
        )}

        <div className="mb-6 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          <div className="border-b border-line bg-sand/40 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Planilla (solo visualización)
          </div>
          <ScheduleTable
            doc={detail}
            readOnly
            paintMode={false}
            activeCode=""
            compact
            onChange={() => undefined}
            onAddStaff={() => undefined}
            onNewDemo={() => undefined}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-6">
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          {mode === 'revisor' ? 'Módulo revisor' : 'Módulo validador'}
        </p>
        <h1 className="font-display text-3xl text-navy">{title}</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">{subtitle}</p>
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
        <p className="rounded-2xl border border-dashed border-line bg-white/70 px-4 py-12 text-center text-sm text-muted">
          No hay horarios pendientes
          {mode === 'revisor' ? ' de revisión' : ' de validación'}.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {pending.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => void openCard(s.id)}
              className={`group relative overflow-hidden rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal/40 hover:shadow-md ${
                selectedId === s.id
                  ? 'border-navy ring-2 ring-navy/15'
                  : 'border-line'
              }`}
            >
              <span className="absolute right-3 top-3 rounded-full bg-sand px-2 py-0.5 text-[10px] font-bold text-muted">
                #{i + 1}
              </span>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                {s.serviceType === 'enfermeria' ? 'Enfermería' : 'Médico'}
              </p>
              <h2 className="mt-1 font-display text-xl text-navy group-hover:text-teal">
                {s.unitName}
              </h2>
              <p className="mt-1 text-sm text-ink">
                {MONTHS_ES[s.month - 1]} {s.year}
              </p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    mode === 'revisor'
                      ? 'bg-violet-100 text-violet-950'
                      : 'bg-emerald-100 text-emerald-950'
                  }`}
                >
                  {s.status ? STATUS_LABEL[s.status] : '—'}
                </span>
                <span className="text-sm font-semibold text-navy">
                  Revisar →
                </span>
              </div>
              <p className="mt-2 text-[11px] text-muted">
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
  if (isValidadorRole(user.role) && !isRevisorRole(user.role)) return 'validador'
  if (isRevisorRole(user.role)) return 'revisor'
  if (isValidadorRole(user.role)) return 'validador'
  return 'editor'
}
