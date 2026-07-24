import { useMemo, useState } from 'react'
import type { AppUser, ElectronicSignRecord, SavedIndexItem, ScheduleDoc } from '../types'
import { MONTHS_ES, STATUS_LABEL } from '../types'
import { roleLabel, transitionStatus } from '../lib/auth'
import { loadAnySchedule } from '../lib/api'
import { notifyJefeScheduleValidated } from '../lib/notifications'
import { blockingValidationErrors } from '../lib/validation'
import { MonthSummary } from './MonthSummary'
import { SERVICE_LABEL } from '../data/templates'
import {
  buildSchedulePdfBlob,
  blobToPdfBase64,
  pdfFileName,
  specialtyFolderName,
} from '../lib/exportPdf'
import {
  clearArchiveRootCache,
  getArchiveRootHint,
  pickArchiveRoot,
  savePdfInSpecialtyFolder,
  supportsDirectoryPicker,
  downloadPdfDirect,
} from '../lib/archiveFolder'
import { SignatureGate } from './SignatureGate'
import { InstitutionalPreview } from './InstitutionalPreview'
import { ReadOnlySchedulePanels } from './ReadOnlySchedulePanels'
import { PermisosVacacionesPanel } from './PermisosVacacionesPanel'

type Props = {
  user: AppUser
  items: SavedIndexItem[]
  loading?: boolean
  onRefresh: () => void
  onChanged: (doc: ScheduleDoc) => void
  onFlash: (msg: string) => void
  onNotify?: () => void
}

type ModuleTab = 'pendientes' | 'archivo' | 'permisos'

/**
 * Validador = Talento Humano:
 * 1) pendientes de validar  2) archivo  3) permisos/vacaciones (visualiza todo)
 */
export function ValidadorWorkspace({
  user,
  items,
  loading,
  onRefresh,
  onChanged,
  onFlash,
  onNotify,
}: Props) {
  const [module, setModule] = useState<ModuleTab>('pendientes')
  const [filter, setFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ScheduleDoc | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [busy, setBusy] = useState(false)
  const [rootHint, setRootHint] = useState(getArchiveRootHint())
  const [signOpen, setSignOpen] = useState(false)

  const pending = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    return items
      .filter((i) => i.status === 'APROBADO')
      .filter((i) => {
        if (!needle) return true
        return `${i.unitName} ${MONTHS_ES[i.month - 1]} ${i.year}`
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [items, filter])

  const archived = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    return items
      .filter((i) => i.status === 'ARCHIVADO')
      .filter((i) => {
        if (!needle) return true
        return `${i.unitName} ${MONTHS_ES[i.month - 1]} ${i.year}`
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => {
        const u = a.unitName.localeCompare(b.unitName, 'es')
        if (u !== 0) return u
        return b.updatedAt.localeCompare(a.updatedAt)
      })
  }, [items, filter])

  const archivedBySpecialty = useMemo(() => {
    const map = new Map<string, SavedIndexItem[]>()
    for (const item of archived) {
      const key = item.unitName || 'Sin servicio'
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'es'))
  }, [archived])

  const cards = module === 'pendientes' ? pending : archived

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
  }

  async function chooseRootFolder() {
    try {
      const root = await pickArchiveRoot()
      setRootHint(root.name)
      onFlash(`Carpeta de archivo: ${root.name}`)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      onFlash('No se pudo seleccionar la carpeta')
    }
  }

  async function validateAndArchive(
    doc: ScheduleDoc,
    signedName: string,
    electronic?: ElectronicSignRecord,
  ) {
    setBusy(true)
    setSignOpen(false)
    try {
      const res = transitionStatus(doc, 'ARCHIVADO', user, {
        signedName,
        electronic,
      })
      if (!res.ok) {
        onFlash(res.error)
        return
      }
      const validated = res.doc
      notifyJefeScheduleValidated(validated, signedName)
      onNotify?.()
      onChanged(validated)

      const blob = await buildSchedulePdfBlob(validated)
      const folder = specialtyFolderName(validated)
      const file = pdfFileName(validated)

      try {
        const saved = await savePdfInSpecialtyFolder(folder, file, blob)
        if (saved.mode === 'folder') {
          setRootHint(getArchiveRootHint())
          onFlash(
            `Validado${electronic ? ' (FirmaEC)' : ''} · PDF institucional en ${saved.path}`,
          )
        } else {
          onFlash(
            `Validado${electronic ? ' (FirmaEC)' : ''} · ZIP «${folder}» (use Chrome/Edge para carpeta en disco)`,
          )
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          downloadPdfDirect(blob, file)
          onFlash('Validado · PDF descargado (no eligió carpeta)')
        } else {
          downloadPdfDirect(blob, file)
          onFlash(
            `Validado · PDF descargado: ${e instanceof Error ? e.message : 'sin carpeta'}`,
          )
        }
      }

      backToCards()
      setModule('archivo')
      onRefresh()
    } finally {
      setBusy(false)
    }
  }

  async function redownloadPdf(id: string) {
    setBusy(true)
    try {
      const doc = await loadAnySchedule(id)
      if (!doc) {
        onFlash('No se encontró el horario')
        return
      }
      const blob = await buildSchedulePdfBlob(doc)
      const folder = specialtyFolderName(doc)
      const file = pdfFileName(doc)
      try {
        const saved = await savePdfInSpecialtyFolder(folder, file, blob)
        onFlash(
          saved.mode === 'folder'
            ? `PDF guardado en ${saved.path}`
            : `ZIP descargado: ${saved.path}`,
        )
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
        downloadPdfDirect(blob, file)
        onFlash('PDF descargado')
      }
    } finally {
      setBusy(false)
    }
  }

  function nextPendingId(afterId: string): string | null {
    const idx = pending.findIndex((p) => p.id === afterId)
    if (idx < 0) return pending[0]?.id ?? null
    return pending[idx + 1]?.id ?? pending[0]?.id ?? null
  }

  // ——— Detalle ———
  if (detail) {
    const canValidate = detail.status === 'APROBADO'
    const others = pending.filter((p) => p.id !== detail.id).length
    return (
      <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-6 sm:py-6">
        <SignatureGate
          open={signOpen}
          title="Firmar y validar horario"
          subtitle="Puede firmar con certificado FirmaEC (.p12) o imagen. Se genera QR + PDF institucional y se notifica al jefe."
          defaultName={user.name}
          confirmLabel="Firmar, validar y archivar PDF"
          slot="validador"
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
          onCancel={() => setSignOpen(false)}
          onConfirm={(result) => {
            void validateAndArchive(
              detail,
              result.signedName,
              result.electronic,
            )
          }}
        />
        <button
          type="button"
          onClick={backToCards}
          className="mb-2 text-sm font-semibold text-navy underline"
        >
          ← Volver a tarjetas
        </button>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
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

        {canValidate && (
          <section className="mb-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 shadow-sm">
            <h2 className="font-display text-lg text-navy">
              Firmar, validar y archivar
            </h2>
            <p className="mb-3 text-sm text-muted">
              Al firmar se genera el PDF con el mismo formato institucional que
              imprime el médico (encabezados y firmas) y se guarda en la carpeta
              de la especialidad
              {rootHint ? (
                <>
                  {' '}
                  (<strong>
                    {rootHint}/{specialtyFolderName(detail)}
                  </strong>
                  )
                </>
              ) : (
                <> (se pedirá la carpeta raíz del archivo)</>
              )}
              . El jefe de servicio recibirá un aviso de horario validado.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const blockers = blockingValidationErrors(detail)
                  if (blockers.length > 0) {
                    onFlash(`No se puede validar: ${blockers[0].message}`)
                    return
                  }
                  setSignOpen(true)
                }}
                className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
              >
                {busy ? 'Procesando…' : 'Firmar y validar · PDF'}
              </button>
              {supportsDirectoryPicker() && (
                <button
                  type="button"
                  onClick={() => void chooseRootFolder()}
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold hover:bg-sand"
                >
                  Elegir carpeta raíz
                </button>
              )}
            </div>
          </section>
        )}

        {detail.status === 'ARCHIVADO' && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void redownloadPdf(detail.id)}
              className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Volver a guardar PDF en carpeta
            </button>
          </div>
        )}

        <MonthSummary doc={detail} />
        <InstitutionalPreview doc={detail} onFlash={onFlash} defaultOpen />
        <ReadOnlySchedulePanels doc={detail} />
      </div>
    )
  }

  // ——— Tarjetas: módulos ———
  return (
    <div
      className={`mx-auto px-3 py-6 sm:px-6 ${
        module === 'archivo' || module === 'permisos'
          ? 'max-w-[1400px]'
          : 'max-w-5xl'
      }`}
    >
      <header className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          Talento Humano · Validador
        </p>
        <h1 className="font-display text-3xl text-navy">Validación HGP</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Valide horarios aprobados, archive el PDF y consulte los permisos /
          vacaciones que registran los médicos de cada servicio.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-line">
          <button
            type="button"
            onClick={() => setModule('pendientes')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              module === 'pendientes'
                ? 'bg-navy text-white'
                : 'text-muted hover:bg-sand'
            }`}
          >
            1. Pendientes
            <span className="ml-2 rounded-full bg-white/20 px-1.5 text-xs">
              {pending.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setModule('archivo')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              module === 'archivo'
                ? 'bg-teal text-white'
                : 'text-muted hover:bg-sand'
            }`}
          >
            2. Archivo
            <span className="ml-2 rounded-full bg-white/20 px-1.5 text-xs">
              {archived.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setModule('permisos')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              module === 'permisos'
                ? 'bg-navy text-white'
                : 'text-muted hover:bg-sand'
            }`}
          >
            3. Permisos TH
          </button>
        </div>
        {module !== 'permisos' ? (
          <>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Buscar especialidad o mes…"
              className="min-w-[180px] flex-1 rounded-xl border border-line bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold hover:bg-sand"
            >
              Actualizar
            </button>
          </>
        ) : null}
      </div>

      {module !== 'permisos' && supportsDirectoryPicker() && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white/90 px-3 py-2 text-sm">
          <p className="text-muted">
            Carpeta raíz del archivo:{' '}
            <strong className="text-navy">{rootHint ?? 'aún no elegida'}</strong>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void chooseRootFolder()}
              className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white"
            >
              {rootHint ? 'Cambiar carpeta' : 'Elegir carpeta'}
            </button>
            {rootHint && (
              <button
                type="button"
                onClick={() => {
                  clearArchiveRootCache()
                  setRootHint(null)
                  onFlash('Se pedirá carpeta en la próxima validación')
                }}
                className="rounded-lg border border-line px-3 py-1.5 text-xs"
              >
                Olvidar
              </button>
            )}
          </div>
        </div>
      )}

      {loading || loadingDetail ? (
        <p className="rounded-2xl border border-dashed border-line bg-white/70 px-4 py-10 text-center text-sm text-muted">
          Cargando…
        </p>
      ) : module === 'permisos' ? (
        <PermisosVacacionesPanel
          user={user}
          onFlash={onFlash}
          onNotify={onNotify}
          variant="talento_humano"
        />
      ) : module === 'archivo' ? (
        archived.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-white/70 px-4 py-12 text-center text-sm text-muted">
            Aún no hay horarios validados. Valide desde Pendientes.
          </p>
        ) : (
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <h2 className="font-display text-xl text-navy">Archivo validado</h2>
              <span className="rounded-full bg-teal/15 px-2.5 py-0.5 text-xs font-bold text-teal">
                {archived.length}
              </span>
              <div className="h-px min-w-[3rem] flex-1 bg-gradient-to-r from-teal/35 to-transparent" />
              <p className="text-xs text-muted">
                {archivedBySpecialty.length} especialidad
                {archivedBySpecialty.length === 1 ? '' : 'es'} · firmados y sellados
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {archived.map((s) => (
                <article
                  key={s.id}
                  className="group flex min-h-[12rem] flex-col overflow-hidden rounded-2xl border border-teal/20 bg-gradient-to-b from-white via-white to-teal/[0.06] shadow-sm transition duration-200 hover:-translate-y-1 hover:border-teal/45 hover:shadow-md"
                >
                  <div
                    className="h-1.5 w-full bg-gradient-to-r from-navy via-teal to-teal-soft"
                    aria-hidden
                  />
                  <div className="flex flex-1 flex-col p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <span className="rounded-md bg-sand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy">
                        {s.serviceType === 'enfermeria'
                          ? 'Enfermería'
                          : 'Médico'}
                      </span>
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-100">
                        Validado
                      </span>
                    </div>

                    <h3
                      className="font-display text-lg leading-snug text-navy line-clamp-2 transition group-hover:text-teal"
                      title={s.unitName}
                    >
                      {s.unitName}
                    </h3>
                    <p className="mt-1.5 text-sm font-semibold text-ink">
                      {MONTHS_ES[s.month - 1]} {s.year}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                      Actualizado{' '}
                      {new Date(s.updatedAt).toLocaleDateString('es-EC', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>

                    <div className="mt-auto flex gap-2 pt-4">
                      <button
                        type="button"
                        onClick={() => void openCard(s.id)}
                        className="flex-1 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-navy transition hover:bg-sand"
                      >
                        Ver horario
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void redownloadPdf(s.id)}
                        className="flex-1 rounded-xl bg-teal px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                      >
                        Descargar PDF
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )
      ) : cards.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white/70 px-4 py-12 text-center text-sm text-muted">
          No hay horarios pendientes de validación.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => void openCard(s.id)}
              className={`group relative overflow-hidden rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-teal/40 hover:shadow-lg ${
                selectedId === s.id
                  ? 'border-navy ring-2 ring-navy/15'
                  : 'border-line'
              }`}
            >
              <div
                className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-navy to-teal"
                aria-hidden
              />
              <span className="absolute right-3 top-4 rounded-full bg-sand px-2 py-0.5 text-[10px] font-bold text-muted">
                #{i + 1}
              </span>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                {s.serviceType === 'enfermeria' ? 'Enfermería' : 'Médico'}
              </p>
              <h2 className="mt-2 pr-8 font-display text-xl leading-snug text-navy group-hover:text-teal">
                {s.unitName}
              </h2>
              <p className="mt-1 text-sm text-ink">
                {MONTHS_ES[s.month - 1]} {s.year}
              </p>
              <div className="mt-5 flex items-center justify-between">
                <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-100">
                  {s.status ? STATUS_LABEL[s.status] : '—'}
                </span>
                <span className="text-sm font-semibold text-navy">
                  Abrir →
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
