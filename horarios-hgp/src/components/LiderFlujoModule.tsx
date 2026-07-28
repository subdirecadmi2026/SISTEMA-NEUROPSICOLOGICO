import { useMemo, useState } from 'react'
import type {
  AppUser,
  SavedIndexItem,
  ScheduleDoc,
  ScheduleStatus,
} from '../types'
import { MONTHS_ES, STATUS_LABEL } from '../types'
import { loadAnySchedule } from '../lib/api'
import { SERVICE_LABEL } from '../data/templates'
import {
  buildSchedulePdfBlob,
  downloadBlob,
  pdfFileName,
} from '../lib/exportPdf'
import { InstitutionalPreview } from './InstitutionalPreview'
import { ReadOnlySchedulePanels } from './ReadOnlySchedulePanels'
import { MonthSummary } from './MonthSummary'

type Props = {
  user: AppUser
  items: SavedIndexItem[]
  loading?: boolean
  onRefresh: () => void
  onFlash: (msg: string) => void
  /** Abrir en el editor (borrador / en curso). */
  onOpenInEditor: (id: string) => void
  onCreate: () => void
  onDelete?: (id: string) => void
}

type ModuleTab = 'en_curso' | 'validados'

/** Pasos del flujo visibles para el líder (lenguaje operativo). */
const FLOW_STEPS: Array<{
  status: ScheduleStatus
  label: string
  hint: string
}> = [
  { status: 'BORRADOR', label: 'Borrador', hint: 'En elaboración' },
  {
    status: 'EN_REVISION',
    label: 'Enviado',
    hint: 'Admisiones + Revisor',
  },
  { status: 'APROBADO', label: 'Aprobado', hint: 'Listo para validador' },
  { status: 'ARCHIVADO', label: 'Validado', hint: 'Firmado y cerrado' },
]

function periodKey(item: Pick<SavedIndexItem, 'year' | 'month'>) {
  return `${item.year}-${String(item.month).padStart(2, '0')}`
}

function periodLabel(item: Pick<SavedIndexItem, 'year' | 'month'>) {
  return `${MONTHS_ES[item.month - 1]} ${item.year}`
}

function normalizeStatus(status?: ScheduleStatus): ScheduleStatus {
  return status ?? 'BORRADOR'
}

function stepIndex(status?: ScheduleStatus): number {
  const idx = FLOW_STEPS.findIndex((s) => s.status === normalizeStatus(status))
  return idx < 0 ? 0 : idx
}

function FlowStepper({ status }: { status: ScheduleStatus }) {
  const current = stepIndex(status)
  return (
    <div className="mt-3 rounded-xl bg-sand/50 px-2.5 py-3 ring-1 ring-line/70" aria-label="Progreso del flujo">
      {/* Círculos + línea: el flujo completo siempre cabe */}
      <ol className="relative grid grid-cols-4">
        <span
          className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-[14px] h-0.5 -translate-y-1/2 bg-line"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute left-[12.5%] top-[14px] h-0.5 -translate-y-1/2 bg-gradient-to-r from-navy to-teal transition-all duration-300"
          style={{
            width: `${(current / Math.max(FLOW_STEPS.length - 1, 1)) * 75}%`,
          }}
          aria-hidden
        />
        {FLOW_STEPS.map((step, i) => {
          const done = i < current
          const active = i === current
          return (
            <li key={step.status} className="relative z-[1] flex min-w-0 flex-col items-center gap-1.5 text-center">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold shadow-sm transition ${
                  active
                    ? 'bg-navy text-white ring-4 ring-navy/15'
                    : done
                      ? 'bg-teal text-white'
                      : 'bg-white text-muted ring-1 ring-line'
                }`}
                title={`${step.label}: ${step.hint}`}
              >
                {done && !active ? (
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
                    <path
                      d="M3.5 8.5 6.5 11.5 12.5 4.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={`w-full px-0.5 text-[11px] font-semibold leading-tight ${
                  active
                    ? 'text-navy'
                    : done
                      ? 'text-teal'
                      : 'text-muted'
                }`}
              >
                {/* Sin truncate: el texto se parte en 2 líneas si hace falta */}
                <span className="block break-words hyphens-auto">{step.label}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** Icono de horario (calendario + reloj). */
function ScheduleCardIcon({ validated }: { validated: boolean }) {
  return (
    <span
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
        validated
          ? 'bg-gradient-to-br from-teal/20 to-teal/5 text-teal ring-1 ring-teal/30'
          : 'bg-gradient-to-br from-navy/12 to-navy/[0.03] text-navy ring-1 ring-navy/20'
      }`}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[22px] w-[22px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
        <path d="M3 9.5h18" />
        <path d="M8 2.5v4" />
        <path d="M16 2.5v4" />
        <circle cx="15.25" cy="15.25" r="3.75" />
        <path d="M15.25 13.6v1.75l1.15.7" />
      </svg>
    </span>
  )
}

/**
 * Módulo del líder médico: seguimiento del flujo por mes (independiente
 * del horario que esté editando) y archivo de horarios ya validados/firmados.
 */
export function LiderFlujoModule({
  user,
  items,
  loading,
  onRefresh,
  onFlash,
  onOpenInEditor,
  onCreate,
  onDelete,
}: Props) {
  const [module, setModule] = useState<ModuleTab>('en_curso')
  const [filter, setFilter] = useState('')
  const [detail, setDetail] = useState<ScheduleDoc | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [busyPdf, setBusyPdf] = useState(false)

  const enCurso = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    return items
      .filter((i) => normalizeStatus(i.status) !== 'ARCHIVADO')
      .filter((i) => {
        if (!needle) return true
        const st = normalizeStatus(i.status)
        return `${i.unitName} ${periodLabel(i)} ${STATUS_LABEL[st]}`
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => {
        const p = periodKey(b).localeCompare(periodKey(a))
        if (p !== 0) return p
        return b.updatedAt.localeCompare(a.updatedAt)
      })
  }, [items, filter])

  const validados = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    return items
      .filter((i) => normalizeStatus(i.status) === 'ARCHIVADO')
      .filter((i) => {
        if (!needle) return true
        return `${i.unitName} ${periodLabel(i)}`
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => {
        const p = periodKey(b).localeCompare(periodKey(a))
        if (p !== 0) return p
        return a.unitName.localeCompare(b.unitName, 'es')
      })
  }, [items, filter])

  const groupedEnCurso = useMemo(() => {
    const map = new Map<string, SavedIndexItem[]>()
    for (const item of enCurso) {
      const key = periodKey(item)
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [enCurso])

  const groupedValidados = useMemo(() => {
    const map = new Map<string, SavedIndexItem[]>()
    for (const item of validados) {
      const key = periodKey(item)
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [validados])

  async function openValidated(id: string) {
    setLoadingDetail(true)
    try {
      const doc = await loadAnySchedule(id)
      if (!doc) {
        onFlash('No se pudo abrir el horario validado')
        return
      }
      setDetail(doc)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      onFlash(e instanceof Error ? e.message : 'Error al abrir')
    } finally {
      setLoadingDetail(false)
    }
  }

  async function downloadCompleto(doc: ScheduleDoc) {
    setBusyPdf(true)
    try {
      const grids: Array<'turno' | 'area'> =
        doc.serviceType === 'medico' ? ['turno', 'area'] : ['turno']
      const blob = await buildSchedulePdfBlob(doc, { grids })
      downloadBlob(blob, pdfFileName(doc, 'ambos'))
      onFlash(
        doc.serviceType === 'medico'
          ? 'PDF completo: pág. 1 horario, pág. 2 distribución'
          : 'PDF del horario descargado',
      )
    } catch (e) {
      onFlash(e instanceof Error ? e.message : 'No se pudo generar el PDF')
    } finally {
      setBusyPdf(false)
    }
  }

  async function printCompleto(doc: ScheduleDoc) {
    setDetail(doc)
    await new Promise((r) => setTimeout(r, 120))
    document.body.dataset.printing = '1'
    delete document.body.dataset.printOnly
    window.print()
    window.setTimeout(() => {
      delete document.body.dataset.printing
      delete document.body.dataset.printOnly
    }, 800)
  }

  if (detail) {
    const signed =
      detail.electronicSigns?.map((s) => s.slot).join(', ') ||
      detail.signatures.map((s) => s.cargo || s.role).join(', ')
    return (
      <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-6 sm:py-6">
        <button
          type="button"
          onClick={() => setDetail(null)}
          className="mb-2 text-sm font-semibold text-navy underline"
        >
          ← Volver al flujo
        </button>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal">
              Horario validado · firmado
            </p>
            <h1 className="font-display text-2xl text-navy sm:text-3xl">
              {detail.unitName}
            </h1>
            <p className="text-sm text-muted">
              {SERVICE_LABEL[detail.serviceType]} ·{' '}
              {periodLabel(detail)} ·{' '}
              <strong>{STATUS_LABEL[detail.status]}</strong>
              {detail.talentoHumano
                ? ` · Validó: ${detail.talentoHumano}`
                : ''}
            </p>
            {signed ? (
              <p className="mt-1 text-xs text-muted">Firmas: {signed}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busyPdf}
              onClick={() => void downloadCompleto(detail)}
              className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busyPdf ? 'Generando…' : 'Descargar horario completo'}
            </button>
            <button
              type="button"
              onClick={() => void printCompleto(detail)}
              className="rounded-xl border border-teal/40 bg-teal px-4 py-2 text-sm font-semibold text-white"
            >
              Imprimir horario completo
            </button>
          </div>
        </div>

        <MonthSummary doc={detail} />
        <ReadOnlySchedulePanels doc={detail} />
        <InstitutionalPreview
          doc={detail}
          defaultOpen
          onFlash={onFlash}
        />
      </div>
    )
  }

  const groups = module === 'en_curso' ? groupedEnCurso : groupedValidados
  const emptyMsg = filter.trim()
    ? `Ningún resultado para «${filter.trim()}».`
    : module === 'en_curso'
      ? 'No hay horarios en curso. Cree uno o espere el siguiente mes.'
      : 'Aún no hay horarios validados. Cuando Talento Humano firme, aparecerán aquí.'

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-6 sm:py-6">
      <header className="mb-4 rounded-2xl border border-line bg-white/90 p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-navy">
              Flujo de horarios
            </h1>
            <p className="text-sm text-muted">
              Seguimiento independiente por mes · {user.name}
              {loading ? ' · actualizando…' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold hover:bg-sand"
            >
              Actualizar
            </button>
            <button
              type="button"
              onClick={onCreate}
              className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              + Crear horario
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex gap-1 rounded-xl bg-sand/60 p-1 ring-1 ring-line">
            <button
              type="button"
              onClick={() => setModule('en_curso')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                module === 'en_curso'
                  ? 'bg-navy text-white shadow-sm'
                  : 'text-muted hover:bg-white'
              }`}
            >
              En curso
              <span className="ml-2 rounded-full bg-white/20 px-1.5 text-xs">
                {enCurso.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setModule('validados')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                module === 'validados'
                  ? 'bg-teal text-white shadow-sm'
                  : 'text-muted hover:bg-white'
              }`}
            >
              Validados / archivo
              <span className="ml-2 rounded-full bg-white/20 px-1.5 text-xs">
                {validados.length}
              </span>
            </button>
          </div>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar servicio o mes…"
            className="min-w-[180px] flex-1 rounded-xl border border-line bg-white px-3 py-2 text-sm"
          />
        </div>
      </header>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white/80 px-4 py-10 text-center">
          <p className="mb-3 text-sm text-muted">{emptyMsg}</p>
          {module === 'en_curso' && !filter.trim() ? (
            <button
              type="button"
              onClick={onCreate}
              className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white"
            >
              Crear horario
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([key, list]) => {
            const sample = list[0]
            return (
              <section key={key}>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="font-display text-lg text-navy">
                    {periodLabel(sample)}
                  </h2>
                  <span className="rounded-full bg-sand px-2 py-0.5 text-[10px] font-bold text-muted">
                    {list.length}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-line to-transparent" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map((item) => {
                    const st = normalizeStatus(item.status)
                    const isValidated = st === 'ARCHIVADO'
                    const currentStep = FLOW_STEPS[stepIndex(st)]
                    return (
                      <article
                        key={item.id}
                        className={`group flex min-h-[16rem] flex-col overflow-hidden rounded-2xl border bg-gradient-to-b from-white via-white shadow-[0_8px_24px_-12px_rgba(15,40,70,0.18)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_32px_-14px_rgba(15,40,70,0.28)] ${
                          isValidated
                            ? 'border-teal/30 to-teal/[0.07] hover:border-teal/50'
                            : 'border-line to-sand/30 hover:border-navy/35'
                        }`}
                      >
                        <div
                          className={`h-1.5 w-full ${
                            isValidated
                              ? 'bg-gradient-to-r from-navy via-teal to-teal-soft'
                              : 'bg-gradient-to-r from-navy to-teal'
                          }`}
                          aria-hidden
                        />
                        <div className="flex flex-1 flex-col p-4 sm:p-5">
                          <div className="mb-1 flex items-start gap-3">
                            <ScheduleCardIcon validated={isValidated} />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h3
                                    className="line-clamp-2 font-display text-xl leading-snug text-navy transition group-hover:text-teal"
                                    title={item.unitName}
                                  >
                                    {item.unitName}
                                  </h3>
                                  <p className="mt-0.5 text-xs font-medium text-muted">
                                    {SERVICE_LABEL[item.serviceType]} ·{' '}
                                    {periodLabel(item)}
                                  </p>
                                </div>
                                <span
                                  className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                    isValidated
                                      ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100'
                                      : st === 'EN_REVISION'
                                        ? 'bg-amber-100 text-amber-950 ring-1 ring-amber-200/70'
                                        : st === 'APROBADO'
                                          ? 'bg-sky-100 text-sky-950 ring-1 ring-sky-200/70'
                                          : 'bg-sand text-navy/70 ring-1 ring-line'
                                  }`}
                                >
                                  {currentStep?.label ?? STATUS_LABEL[st]}
                                </span>
                              </div>
                            </div>
                          </div>

                          <FlowStepper status={st} />

                          <p className="mt-3 text-[11px] leading-relaxed text-muted">
                            {currentStep?.hint ?? 'Estado del horario'}
                            <span className="mx-1.5 text-line">·</span>
                            Actualizado{' '}
                            {new Date(item.updatedAt).toLocaleString('es-EC', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </p>

                          <div className="mt-auto flex flex-wrap gap-2 pt-4">
                            {isValidated ? (
                              <>
                                <button
                                  type="button"
                                  disabled={loadingDetail}
                                  onClick={() => void openValidated(item.id)}
                                  className="rounded-xl bg-navy px-3.5 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                                >
                                  Ver firmado
                                </button>
                                <button
                                  type="button"
                                  disabled={busyPdf}
                                  onClick={() => {
                                    void (async () => {
                                      const doc = await loadAnySchedule(item.id)
                                      if (!doc) {
                                        onFlash('No se encontró el horario')
                                        return
                                      }
                                      await downloadCompleto(doc)
                                    })()
                                  }}
                                  className="rounded-xl bg-teal px-3.5 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                                >
                                  Descargar completo
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onOpenInEditor(item.id)}
                                className="rounded-xl bg-navy px-3.5 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                              >
                                {st === 'BORRADOR'
                                  ? 'Abrir y editar'
                                  : 'Ver en editor'}
                              </button>
                            )}
                            {onDelete && st === 'BORRADOR' ? (
                              <button
                                type="button"
                                onClick={() => onDelete(item.id)}
                                className="rounded-xl border border-line px-3.5 py-2 text-xs font-semibold text-muted transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800"
                              >
                                Eliminar
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
