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
    <ol className="flex items-center gap-1" aria-label="Progreso del flujo">
      {FLOW_STEPS.map((step, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={step.status} className="flex items-center gap-1">
            {i > 0 ? (
              <span
                className={`h-px w-2 sm:w-3 ${
                  done || active ? 'bg-teal' : 'bg-line'
                }`}
                aria-hidden
              />
            ) : null}
            <span
              className={`inline-flex h-6 items-center justify-center rounded-md px-1.5 text-[10px] font-bold uppercase tracking-wide sm:px-2 ${
                active
                  ? 'bg-navy text-white'
                  : done
                    ? 'bg-teal/15 text-teal'
                    : 'bg-sand text-muted'
              }`}
              title={`${step.label}: ${step.hint}`}
            >
              <span className="sm:hidden">{i + 1}</span>
              <span className="hidden sm:inline">{step.label}</span>
            </span>
          </li>
        )
      })}
    </ol>
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
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {list.map((item) => {
                    const st = normalizeStatus(item.status)
                    const isValidated = st === 'ARCHIVADO'
                    return (
                      <article
                        key={item.id}
                        className={`group flex min-h-[12rem] flex-col overflow-hidden rounded-2xl border bg-gradient-to-b from-white via-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md ${
                          isValidated
                            ? 'border-teal/25 to-teal/[0.06] hover:border-teal/45'
                            : 'border-line to-sand/20 hover:border-navy/30'
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
                        <div className="flex flex-1 flex-col p-4">
                          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3
                                className="line-clamp-2 font-display text-lg leading-snug text-navy transition group-hover:text-teal"
                                title={item.unitName}
                              >
                                {item.unitName}
                              </h3>
                              <p className="text-xs text-muted">
                                {SERVICE_LABEL[item.serviceType]}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                                isValidated
                                  ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100'
                                  : st === 'EN_REVISION'
                                    ? 'bg-amber-100 text-amber-950'
                                    : st === 'APROBADO'
                                      ? 'bg-sky-100 text-sky-950'
                                      : 'bg-sand text-muted'
                              }`}
                            >
                              {FLOW_STEPS[stepIndex(st)]?.label ??
                                STATUS_LABEL[st]}
                            </span>
                          </div>

                          <FlowStepper status={st} />

                          <p className="mt-2 text-[11px] text-muted">
                            Actualizado{' '}
                            {new Date(item.updatedAt).toLocaleString('es-EC', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </p>

                          <div className="mt-auto flex flex-wrap gap-2 pt-3">
                            {isValidated ? (
                              <>
                                <button
                                  type="button"
                                  disabled={loadingDetail}
                                  onClick={() => void openValidated(item.id)}
                                  className="rounded-xl bg-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
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
                                  className="rounded-xl bg-teal px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                                >
                                  Descargar completo
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onOpenInEditor(item.id)}
                                className="rounded-xl bg-navy px-3 py-1.5 text-xs font-semibold text-white"
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
                                className="rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-sand"
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
