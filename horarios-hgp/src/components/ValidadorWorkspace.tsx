import { useMemo, useState } from 'react'
import type { AppUser, ElectronicSignRecord, SavedIndexItem, ScheduleDoc } from '../types'
import { MONTHS_ES, STATUS_LABEL } from '../types'
import { roleLabel, transitionStatus } from '../lib/auth'
import { loadAnySchedule } from '../lib/api'
import { notifyJefeScheduleValidated } from '../lib/notifications'
import { ScheduleTable } from './ScheduleTable'
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
 * Validador: 1) tarjetas pendientes de todas las especialidades
 * 2) archivo validado + al validar guarda PDF en carpeta de la especialidad
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
                onClick={() => setSignOpen(true)}
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

  // ——— Tarjetas: dos módulos ———
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
          Módulo validador
        </p>
        <h1 className="font-display text-3xl text-navy">Validación HGP</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Pendientes de todas las especialidades, archivo de horarios ya
          validados, y registro de vacaciones / permisos temporales del
          personal (médico o enfermería).
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
            2. Archivo validado
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
            3. Permisos / vacaciones
          </button>
        </div>
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
      </div>

      {supportsDirectoryPicker() && (
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

      {!supportsDirectoryPicker() && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Su navegador no permite crear carpetas en disco. Al validar se
          descargará un <strong>ZIP</strong> con la carpeta de la especialidad.
          En Chrome o Edge puede guardar directo en una carpeta.
        </p>
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
        />
      ) : module === 'archivo' ? (
        archivedBySpecialty.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-white/70 px-4 py-12 text-center text-sm text-muted">
            Aún no hay horarios validados. Valide desde Pendientes.
          </p>
        ) : (
          <div className="space-y-5">
            {archivedBySpecialty.map(([specialty, list]) => (
              <section key={specialty}>
                <div className="mb-2 flex items-end justify-between gap-2 border-b border-line/80 pb-1.5">
                  <div>
                    <h2 className="font-display text-lg leading-tight text-navy">
                      {specialty}
                    </h2>
                    <p className="text-[11px] text-muted">
                      Carpeta · {list.length} validado
                      {list.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                  {list.map((s) => (
                    <article
                      key={s.id}
                      className="group relative flex min-h-[7.25rem] flex-col overflow-hidden rounded-xl border border-line bg-gradient-to-b from-white to-sand/30 p-2.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal/45 hover:shadow-md"
                    >
                      <div
                        className="absolute inset-x-0 top-0 h-0.5 bg-teal/70"
                        aria-hidden
                      />
                      <div className="flex items-center justify-between gap-1 pt-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-teal">
                          {s.serviceType === 'enfermeria' ? 'Enf' : 'Med'}
                        </span>
                        <span className="text-[9px] font-semibold text-emerald-800">
                          ✓
                        </span>
                      </div>
                      <h3 className="mt-1 truncate font-display text-[0.95rem] leading-snug text-navy">
                        {MONTHS_ES[s.month - 1]}
                        <span className="ml-1 font-sans text-[11px] font-semibold text-muted">
                          {s.year}
                        </span>
                      </h3>
                      <p className="mt-0.5 text-[10px] tabular-nums text-muted">
                        {new Date(s.updatedAt).toLocaleDateString('es-EC', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </p>
                      <div className="mt-auto flex gap-1 pt-2">
                        <button
                          type="button"
                          onClick={() => void openCard(s.id)}
                          className="flex-1 rounded-md border border-line/90 bg-white px-1.5 py-1 text-[10px] font-semibold text-navy hover:bg-sand"
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void redownloadPdf(s.id)}
                          className="flex-1 rounded-md bg-teal px-1.5 py-1 text-[10px] font-semibold text-white hover:brightness-110 disabled:opacity-50"
                        >
                          PDF
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )
      ) : cards.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white/70 px-4 py-12 text-center text-sm text-muted">
          No hay horarios pendientes de validación.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => void openCard(s.id)}
              className={`group rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal/40 hover:shadow-md ${
                selectedId === s.id
                  ? 'border-navy ring-2 ring-navy/15'
                  : 'border-line'
              }`}
            >
              <span className="float-right rounded-full bg-sand px-2 py-0.5 text-[10px] font-bold text-muted">
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
              <div className="mt-4 flex items-center justify-between">
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-950">
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
