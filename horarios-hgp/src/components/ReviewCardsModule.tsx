import { useMemo, useState } from 'react'
import type { AppUser, SavedIndexItem, ScheduleDoc } from '../types'
import { MONTHS_ES, STATUS_LABEL } from '../types'
import {
  hasAdmisionesApproval,
  hasRevisorApproval,
  isAdmisionesRole,
  isRevisorRole,
  isValidadorRole,
  roleLabel,
  transitionStatus,
} from '../lib/auth'
import { loadAnySchedule } from '../lib/api'
import {
  notifyJefeScheduleValidated,
  notifyJefeScheduleReturned,
} from '../lib/notifications'
import { MonthSummary } from './MonthSummary'
import { InstitutionalPreview } from './InstitutionalPreview'
import { ReadOnlySchedulePanels } from './ReadOnlySchedulePanels'
import { blockingValidationErrors } from '../lib/validation'
import { SERVICE_LABEL } from '../data/templates'
import { SignatureGate } from './SignatureGate'
import { slotForApprovalAs, slotForStatus } from '../lib/firmaEc'
import {
  blobToPdfBase64,
  buildSchedulePdfBlob,
  pdfFileName,
} from '../lib/exportPdf'

type Mode = 'revisor' | 'validador' | 'admisiones'

type Props = {
  mode: Mode
  user: AppUser
  items: SavedIndexItem[]
  loading?: boolean
  onRefresh: () => void
  onChanged: (doc: ScheduleDoc) => void
  onFlash: (msg: string) => void
  onNotify?: () => void
}

/**
 * Módulo exclusivo: tarjetas → abrir → ver horario/distribución · aprobar.
 * Admisiones y Revisor dan visto bueno; Validador archiva.
 */
export function ReviewCardsModule({
  mode,
  user,
  items,
  loading,
  onRefresh,
  onChanged,
  onFlash,
  onNotify,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ScheduleDoc | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [correction, setCorrection] = useState('')
  const [filter, setFilter] = useState('')
  const [signNext, setSignNext] = useState<ScheduleDoc['status'] | null>(null)
  const [listTab, setListTab] = useState<'pendientes' | 'historial'>('pendientes')

  const approvalAs: 'admisiones' | 'revisor' | null =
    mode === 'admisiones' ? 'admisiones' : mode === 'revisor' ? 'revisor' : null

  const pending = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    return items
      .filter((i) => {
        if (mode === 'validador') return i.status === 'APROBADO'
        if (mode === 'admisiones') {
          return (
            i.status === 'EN_REVISION' &&
            !i.admisionesApproved
          )
        }
        // revisor
        return i.status === 'EN_REVISION' && !i.revisorApproved
      })
      .filter((i) => {
        if (!needle) return true
        return `${i.unitName} ${MONTHS_ES[i.month - 1]} ${i.year}`
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [items, mode, filter])

  const historial = useMemo(() => {
    if (mode === 'validador') return []
    const needle = filter.trim().toLowerCase()
    return items
      .filter((i) => {
        if (mode === 'admisiones') {
          return (
            i.status === 'APROBADO' ||
            i.status === 'ARCHIVADO' ||
            (i.status === 'EN_REVISION' && !!i.admisionesApproved)
          )
        }
        return (
          i.status === 'APROBADO' ||
          i.status === 'ARCHIVADO' ||
          (i.status === 'EN_REVISION' && !!i.revisorApproved)
        )
      })
      .filter((i) => {
        if (!needle) return true
        return `${i.unitName} ${MONTHS_ES[i.month - 1]} ${i.year}`
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [items, mode, filter])

  const cards = listTab === 'pendientes' ? pending : historial

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
    const res = transitionStatus(detail, next, user, {
      ...opts,
      approvalAs: next === 'APROBADO' ? approvalAs ?? undefined : undefined,
    })
    if (!res.ok) {
      onFlash(res.error)
      return
    }
    if (next === 'ARCHIVADO') {
      notifyJefeScheduleValidated(
        res.doc,
        opts?.signedName?.trim() || user.name,
      )
      onNotify?.()
    }
    if (next === 'BORRADOR' && opts?.comment?.trim()) {
      notifyJefeScheduleReturned(res.doc, user.name, opts.comment.trim())
      onNotify?.()
    }
    onChanged(res.doc)
    const elec = opts?.electronic ? ' (FirmaEC)' : ''
    const stillPartial =
      next === 'APROBADO' && res.doc.status === 'EN_REVISION'
    onFlash(
      stillPartial
        ? mode === 'admisiones'
          ? `Visto bueno Admisiones${elec} · falta el revisor`
          : `Aprobado por revisor${elec} · falta Admisiones`
        : next === 'APROBADO'
          ? `Firmado y aprobado${elec} · pasa a validador`
          : next === 'ARCHIVADO'
            ? `Firmado y validado${elec} · aviso al jefe`
            : next === 'BORRADOR'
              ? 'Devuelto al jefe con comentario · aviso enviado'
              : `Estado: ${STATUS_LABEL[next]}`,
    )
    setCorrection('')
    setSignNext(null)
    onRefresh()
    if (queue.length > 0 && !stillPartial) {
      void openCard(queue[0].id)
    } else if (stillPartial) {
      setDetail(res.doc)
    } else {
      backToCards()
    }
  }

  const title =
    mode === 'admisiones'
      ? 'Admisiones · horarios'
      : mode === 'revisor'
        ? 'Revisión de horarios'
        : 'Validación de horarios'
  const subtitle =
    mode === 'admisiones'
      ? 'Tarjetas de horarios enviados por el jefe · vea horario y distribución · dé el visto bueno'
      : mode === 'revisor'
        ? 'Abra una tarjeta, revise y apruebe (junto a Admisiones) o devuelva con comentario'
        : 'Abra una tarjeta y valide el horario ya aprobado por Admisiones y Revisor'

  if (detail) {
    const others = pending.filter((p) => p.id !== detail.id).length
    const canApproveAdmisiones =
      mode === 'admisiones' &&
      detail.status === 'EN_REVISION' &&
      !hasAdmisionesApproval(detail)
    const canApproveRevisor =
      mode === 'revisor' &&
      detail.status === 'EN_REVISION' &&
      !hasRevisorApproval(detail)
    const canDecide = canApproveAdmisiones || canApproveRevisor
    const gateSlot =
      signNext === 'ARCHIVADO'
        ? slotForStatus('ARCHIVADO')
        : approvalAs
          ? slotForApprovalAs(approvalAs)
          : 'revisor'

    return (
      <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-6 sm:py-6">
        <SignatureGate
          open={!!signNext}
          title={
            signNext === 'APROBADO'
              ? mode === 'admisiones'
                ? 'Firmar · validado por Admisiones'
                : 'Firmar y aprobar (Revisor)'
              : 'Firmar y validar'
          }
          subtitle="Firme con .p12, app FirmaEC (si hay API) o nombre+QR. El sello solo aparece al confirmar."
          defaultName={user.name}
          confirmLabel={
            signNext === 'APROBADO'
              ? mode === 'admisiones'
                ? 'Firmar visto bueno Admisiones'
                : 'Firmar y aprobar'
              : 'Firmar y validar'
          }
          slot={gateSlot}
          user={user}
          scheduleId={detail.id}
          unitName={detail.unitName}
          getDocumentPdfBase64={async () => {
            const blob = await buildSchedulePdfBlob(detail)
            return {
              base64: await blobToPdfBase64(blob),
              fileName: pdfFileName(detail),
            }
          }}
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
              ← Volver a tarjetas
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
            <p className="mt-1 text-xs text-muted">
              Admisiones:{' '}
              {hasAdmisionesApproval(detail) ? '✓' : 'pendiente'} · Revisor:{' '}
              {hasRevisorApproval(detail) ? '✓' : 'pendiente'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold text-muted">
              {roleLabel(user.role)} · solo lectura
            </span>
            {others > 0 && listTab === 'pendientes' && (
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

        {canDecide && (
          <section
            className={`mb-4 rounded-2xl border-2 p-4 shadow-sm ${
              mode === 'admisiones'
                ? 'border-teal/40 bg-teal/5'
                : 'border-violet-300 bg-violet-50'
            }`}
          >
            <h2 className="font-display text-lg text-navy">
              {mode === 'admisiones'
                ? 'Visto bueno de Admisiones'
                : 'Su decisión'}
            </h2>
            <p className="mb-3 text-sm text-muted">
              {mode === 'admisiones'
                ? 'Revise horario y distribución. Al firmar aparecerá el cuadro «Validado por Admisiones» debajo de feriados.'
                : 'Revise la grilla. Debe aprobar también Admisiones para que pase al validador.'}
            </p>
            <textarea
              className="mb-3 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
              rows={3}
              placeholder={
                mode === 'admisiones'
                  ? 'Comentario si devuelve al jefe…'
                  : 'Ej.: Día 12 sin cobertura nocturna; complete N1…'
              }
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const blockers = blockingValidationErrors(detail)
                  if (blockers.length > 0) {
                    onFlash(`No se puede aprobar: ${blockers[0].message}`)
                    return
                  }
                  setSignNext('APROBADO')
                }}
                className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-deep"
              >
                {mode === 'admisiones'
                  ? 'Firmar · Validado por Admisiones'
                  : 'Firmar y aprobar'}
              </button>
              <button
                type="button"
                disabled={correction.trim().length < 5}
                onClick={() =>
                  applyTransition('BORRADOR', { comment: correction })
                }
                className="rounded-xl border border-amber-700 bg-white px-4 py-2.5 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-40"
                title={
                  correction.trim().length < 5
                    ? 'Escriba un comentario de al menos 5 caracteres'
                    : undefined
                }
              >
                Devolver con comentario
              </button>
            </div>
          </section>
        )}

        {!canDecide && detail.status === 'EN_REVISION' && (
          <p className="mb-4 rounded-xl border border-line bg-sand/40 px-3 py-2 text-sm text-muted">
            {mode === 'admisiones' && hasAdmisionesApproval(detail)
              ? 'Ya dio el visto bueno de Admisiones. Espere al revisor o consulte el historial.'
              : mode === 'revisor' && hasRevisorApproval(detail)
                ? 'Ya aprobó como revisor. Espere a Admisiones o consulte el historial.'
                : 'Solo visualización en este estado.'}
          </p>
        )}

        <MonthSummary doc={detail} />
        <ReadOnlySchedulePanels doc={detail} />
        <InstitutionalPreview doc={detail} onFlash={onFlash} defaultOpen />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-6">
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          {mode === 'admisiones'
            ? 'Módulo Admisiones'
            : mode === 'revisor'
              ? 'Módulo revisor'
              : 'Módulo validador'}
        </p>
        <h1 className="font-display text-3xl text-navy">{title}</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">{subtitle}</p>
      </header>

      {mode !== 'validador' && (
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setListTab('pendientes')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              listTab === 'pendientes'
                ? 'bg-navy text-white'
                : 'border border-line bg-white text-navy'
            }`}
          >
            Pendientes ({pending.length})
          </button>
          <button
            type="button"
            onClick={() => setListTab('historial')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              listTab === 'historial'
                ? 'bg-navy text-white'
                : 'border border-line bg-white text-navy'
            }`}
          >
            Historial ({historial.length})
          </button>
        </div>
      )}

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
          {cards.length} tarjeta{cards.length === 1 ? '' : 's'}
        </span>
      </div>

      {loading || loadingDetail ? (
        <p className="rounded-2xl border border-dashed border-line bg-white/70 px-4 py-10 text-center text-sm text-muted">
          Cargando…
        </p>
      ) : cards.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white/70 px-4 py-12 text-center text-sm text-muted">
          {listTab === 'historial'
            ? 'Aún no hay horarios en el historial.'
            : mode === 'admisiones'
              ? 'No hay horarios pendientes de visto bueno de Admisiones.'
              : mode === 'revisor'
                ? 'No hay horarios pendientes de revisión.'
                : 'No hay horarios pendientes de validación.'}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((s, i) => (
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
              <div className="mt-3 flex flex-wrap gap-1 text-[10px] font-semibold">
                <span
                  className={`rounded-md px-1.5 py-0.5 ${
                    s.admisionesApproved
                      ? 'bg-teal/15 text-teal'
                      : 'bg-sand text-muted'
                  }`}
                >
                  Admisiones {s.admisionesApproved ? '✓' : '·'}
                </span>
                <span
                  className={`rounded-md px-1.5 py-0.5 ${
                    s.revisorApproved
                      ? 'bg-teal/15 text-teal'
                      : 'bg-sand text-muted'
                  }`}
                >
                  Revisor {s.revisorApproved ? '✓' : '·'}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    mode === 'admisiones'
                      ? 'bg-teal/15 text-navy'
                      : mode === 'revisor'
                        ? 'bg-violet-100 text-violet-950'
                        : 'bg-emerald-100 text-emerald-950'
                  }`}
                >
                  {s.status ? STATUS_LABEL[s.status] : '—'}
                </span>
                <span className="text-sm font-semibold text-navy">
                  Abrir →
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
): 'editor' | 'revisor' | 'validador' | 'admisiones' | 'login' | 'admin' {
  if (!user) return 'login'
  if (user.role === 'admin') return 'admin'
  if (user.role === 'lider_servicio') return 'editor'
  if (user.role === 'admisiones' || (isAdmisionesRole(user.role) && !isRevisorRole(user.role) && !isValidadorRole(user.role))) {
    return 'admisiones'
  }
  if (isValidadorRole(user.role) && !isRevisorRole(user.role)) return 'validador'
  if (isRevisorRole(user.role)) return 'revisor'
  if (isValidadorRole(user.role)) return 'validador'
  return 'editor'
}
