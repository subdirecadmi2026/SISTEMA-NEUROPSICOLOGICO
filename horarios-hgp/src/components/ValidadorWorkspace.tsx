import { useMemo, useState } from 'react'
import type { AppUser, SavedIndexItem, ScheduleDoc } from '../types'
import { MONTHS_ES, STATUS_LABEL } from '../types'
import { roleLabel, transitionStatus } from '../lib/auth'
import { loadAnySchedule } from '../lib/api'
import { ScheduleTable } from './ScheduleTable'
import { MonthSummary } from './MonthSummary'
import { SERVICE_LABEL } from '../data/templates'
import {
  buildSchedulePdfBlob,
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

type Props = {
  user: AppUser
  items: SavedIndexItem[]
  loading?: boolean
  onRefresh: () => void
  onChanged: (doc: ScheduleDoc) => void
  onFlash: (msg: string) => void
}

type ModuleTab = 'pendientes' | 'archivo'

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
}: Props) {
  const [module, setModule] = useState<ModuleTab>('pendientes')
  const [filter, setFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ScheduleDoc | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [busy, setBusy] = useState(false)
  const [rootHint, setRootHint] = useState(getArchiveRootHint())

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

  async function validateAndArchive(doc: ScheduleDoc) {
    setBusy(true)
    try {
      const res = transitionStatus(doc, 'ARCHIVADO', user)
      if (!res.ok) {
        onFlash(res.error)
        return
      }
      const validated = res.doc
      onChanged(validated)

      const blob = await buildSchedulePdfBlob(validated)
      const folder = specialtyFolderName(validated)
      const file = pdfFileName(validated)

      try {
        const saved = await savePdfInSpecialtyFolder(folder, file, blob)
        if (saved.mode === 'folder') {
          setRootHint(getArchiveRootHint())
          onFlash(`Validado · PDF en ${saved.path}`)
        } else {
          onFlash(
            `Validado · descargado ZIP con carpeta «${folder}» (use Chrome/Edge para guardar directo en disco)`,
          )
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          // Canceló carpeta: igual validó; descarga PDF suelta
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

  // ——— Detalle ———
  if (detail) {
    const canValidate = detail.status === 'APROBADO'
    return (
      <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-6 sm:py-6">
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
            </p>
          </div>
          <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold text-muted">
            {roleLabel(user.role)} · solo lectura
          </span>
        </div>

        {canValidate && (
          <section className="mb-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 shadow-sm">
            <h2 className="font-display text-lg text-navy">Validar y archivar</h2>
            <p className="mb-3 text-sm text-muted">
              Al validar se genera el PDF y se guarda en la carpeta de la
              especialidad
              {rootHint ? (
                <>
                  {' '}
                  (<strong>{rootHint}/{specialtyFolderName(detail)}</strong>)
                </>
              ) : (
                <> (se pedirá la carpeta raíz del archivo)</>
              )}
              .
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void validateAndArchive(detail)}
                className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
              >
                {busy ? 'Procesando…' : 'Validar · guardar PDF'}
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
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-6">
      <header className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          Módulo validador
        </p>
        <h1 className="font-display text-3xl text-navy">Validación HGP</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Pendientes de todas las especialidades, y archivo de horarios ya
          validados (PDF en carpeta por especialidad).
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
      ) : module === 'archivo' ? (
        archivedBySpecialty.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-white/70 px-4 py-12 text-center text-sm text-muted">
            Aún no hay horarios validados. Valide desde Pendientes.
          </p>
        ) : (
          <div className="space-y-6">
            {archivedBySpecialty.map(([specialty, list]) => (
              <section key={specialty}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="font-display text-xl text-navy">
                    {specialty}
                  </h2>
                  <span className="text-xs font-semibold text-muted">
                    Carpeta: {specialty} · {list.length} horario(s)
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {list.map((s) => (
                    <article
                      key={s.id}
                      className="rounded-2xl border border-line bg-white p-4 shadow-sm"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                        {s.serviceType === 'enfermeria'
                          ? 'Enfermería'
                          : 'Médico'}
                      </p>
                      <h3 className="font-display text-lg text-navy">
                        {MONTHS_ES[s.month - 1]} {s.year}
                      </h3>
                      <p className="mt-1 text-xs text-muted">
                        {STATUS_LABEL.ARCHIVADO} ·{' '}
                        {new Date(s.updatedAt).toLocaleString('es-EC', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void openCard(s.id)}
                          className="rounded-xl border border-line px-3 py-1.5 text-xs font-semibold hover:bg-sand"
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void redownloadPdf(s.id)}
                          className="rounded-xl bg-teal px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          PDF → carpeta
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
