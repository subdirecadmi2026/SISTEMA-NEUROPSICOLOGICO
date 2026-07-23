import { useEffect, useRef, useState } from 'react'
import type {
  AppUser,
  ScheduleDoc,
  ServiceType,
} from './types'
import { MONTHS_ES, STATUS_LABEL, uid } from './types'
import { createBlankSchedule } from './data/demo'
import {
  SERVICE_LABEL,
  UNITS_ENFERMERIA,
  UNITS_MEDICO,
  shiftsFor,
} from './data/templates'
import { exportScheduleExcel } from './lib/exportExcel'
import {
  deleteSchedule,
  listSavedSchedules,
  saveSchedule,
  type SavedIndexItem,
} from './lib/storage'
import {
  applyHolidaysToEmptyCells,
  clearMonthCells,
  duplicatePreviousMonth,
  copyStaffFromPreviousMonth,
  fillEmptyWeekendsWithLibre,
  copyFirstWeekPattern,
  applyPostGuardLibre,
  createNextMonthDraft,
  applyHabitualCodesToEmpty,
  swapCodesInSchedule,
  duplicateScheduleAsNew,
} from './lib/scheduleOps'
import { assertEditable, loadSession, logout, isJefeRole, isRevisorRole, isValidadorRole } from './lib/auth'
import {
  persistSchedule,
  isRemoteEnabled,
  listAllSchedules,
  loadAnySchedule,
  deleteRemoteSchedule,
} from './lib/api'
import { seedServicesIfEmpty } from './lib/seedServices'
import { AuthBar } from './components/AuthBar'
import { StaffManager } from './components/StaffManager'
import { ApprovalPanel } from './components/ApprovalPanel'
import { DistributionPanel } from './components/DistributionPanel'
import { ContingencyPanel } from './components/ContingencyPanel'
import { ShiftPalette } from './components/ShiftPalette'
import { ScheduleTable } from './components/ScheduleTable'
import { CreateScheduleWizard } from './components/CreateScheduleWizard'
import { ScheduleStaffEditor } from './components/ScheduleStaffEditor'
import { NamesEditor } from './components/NamesEditor'
import { SchedulesHome } from './components/SchedulesHome'
import { PrintSheet } from './components/PrintSheet'
import { AlertsBanner } from './components/AlertsBanner'
import { MonthSummary } from './components/MonthSummary'
import { NotesPanel } from './components/NotesPanel'
import { CodeUsageBar } from './components/CodeUsageBar'
import { StaffHoursPanel } from './components/StaffHoursPanel'
import { AuditTrail } from './components/AuditTrail'
import { EmptyCellsPanel } from './components/EmptyCellsPanel'
import { ReplaceCodePanel } from './components/ReplaceCodePanel'
import { ShortcutsHelp } from './components/ShortcutsHelp'
import { ToolsToolbar } from './components/ToolsToolbar'
import { SubmissionChecklist } from './components/SubmissionChecklist'
import { RoleModeBanner } from './components/RoleModeBanner'
import { cloneStaffForSchedule, createEmptyStaff } from './lib/staffLibrary'
import { downloadScheduleCsv } from './lib/exportCsv'
import { shiftMeta } from './data/templates'
import { assignmentsOnDay, daysInMonth } from './lib/calendar'

type TabId =
  | 'horario'
  | 'claves'
  | 'distribucion'
  | 'contingencia'
  | 'personal'
  | 'imprimir'

const now = new Date()

export default function App() {
  const [doc, setDoc] = useState<ScheduleDoc>(() =>
    createBlankSchedule('medico', now.getFullYear(), now.getMonth() + 1, {
      withDemo: false,
      staff: [],
    }),
  )
  const [activeCode, setActiveCode] = useState('CE')
  const [paintMode, setPaintMode] = useState(true)
  const [claveTab, setClaveTab] = useState<'turno' | 'area' | 'ausencia' | 'todas'>(
    'todas',
  )
  const [tab, setTab] = useState<TabId>('horario')
  const [saved, setSaved] = useState<SavedIndexItem[]>([])
  const [toast, setToast] = useState('')
  const [user, setUser] = useState<AppUser | null>(() => loadSession())
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(() => {
    const u = loadSession()
    return !!u && isJefeRole(u.role)
  })
  const [highlightNames, setHighlightNames] = useState(false)
  const [listLoading, setListLoading] = useState(false)
  const undoStack = useRef<ScheduleDoc[]>([])
  const [undoCount, setUndoCount] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [autoSavedAt, setAutoSavedAt] = useState<string | null>(null)
  const [highlightEmpty, setHighlightEmpty] = useState(false)
  const [recentCodes, setRecentCodes] = useState<string[]>([])
  const [compactTable, setCompactTable] = useState(false)
  const [focusDay, setFocusDay] = useState<number | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [jumpDay, setJumpDay] = useState(1)
  const docRefApp = useRef(doc)
  docRefApp.current = doc

  function pickCode(code: string) {
    setActiveCode(code)
    setPaintMode(true)
    setRecentCodes((prev) =>
      [code, ...prev.filter((c) => c !== code)].slice(0, 6),
    )
  }

  const units =
    doc.serviceType === 'enfermeria' ? UNITS_ENFERMERIA : UNITS_MEDICO
  const readOnly = !assertEditable(doc, user)
  const canCreate = !!user && isJefeRole(user.role)
  const canDeleteSaved = !!user && (isJefeRole(user.role) || user.role === 'admin')
  const listDefaultStatus: 'all' | ScheduleDoc['status'] =
    user && isRevisorRole(user.role) && user.role !== 'admin'
      ? 'EN_REVISION'
      : user && isValidadorRole(user.role) && user.role !== 'admin'
        ? 'APROBADO'
        : 'all'
  const visibleSaved = (() => {
    if (!user || user.role === 'admin' || !isJefeRole(user.role)) return saved
    if (user.serviceUnits.length === 0) return saved
    return saved.filter((s) => user.serviceUnits.includes(s.unitName))
  })()
  const namedStaff = doc.staff.filter((s) => s.name.trim().length > 0).length
  const emptySlots = doc.staff.length - namedStaff
  const staffOk = namedStaff >= 1

  async function refreshList() {
    setListLoading(true)
    try {
      const items = await listAllSchedules()
      setSaved(items)
    } catch {
      setSaved(listSavedSchedules())
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    void refreshList()
    if (isRemoteEnabled()) {
      void seedServicesIfEmpty().catch(() => {
        /* silencioso: no bloquear UI */
      })
    }
  }, [])

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2400)
  }

  function patchDoc(next: ScheduleDoc) {
    if (readOnly) {
      flash(
        user && !isJefeRole(user.role)
          ? 'Modo visualización: no puede editar turnos con este rol'
          : 'Horario bloqueado. Solo el jefe en borrador (o admin) puede editar.',
      )
      return
    }
    undoStack.current = [...undoStack.current.slice(-29), doc]
    setUndoCount(undoStack.current.length)
    setDoc(next)
    setDirty(true)
  }

  function undoLast() {
    const prev = undoStack.current.pop()
    setUndoCount(undoStack.current.length)
    if (!prev) {
      flash('Nada que deshacer')
      return
    }
    setDoc(prev)
    setDirty(true)
    flash('Cambio deshecho')
  }

  useEffect(() => {
    if (!dirty || readOnly) return
    const t = window.setTimeout(() => {
      try {
        const savedDoc = saveSchedule(docRefApp.current)
        setDoc(savedDoc)
        setDirty(false)
        setAutoSavedAt(
          new Date().toLocaleTimeString('es-EC', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        )
      } catch {
        /* silencioso */
      }
    }, 12000)
    return () => window.clearTimeout(t)
  }, [dirty, doc, readOnly])

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  function switchService(serviceType: ServiceType) {
    const next = createBlankSchedule(serviceType, doc.year, doc.month)
    setDoc(next)
    setActiveCode(
      shiftsFor(serviceType).find((s) => s.group === 'turno')?.code ?? '',
    )
    setClaveTab('todas')
    setTab('horario')
  }

  function addStaff() {
    const member = {
      ...createEmptyStaff(doc.serviceType, doc.unitName),
      id: uid(doc.serviceType === 'enfermeria' ? 'enf' : 'med'),
      name: '',
      order: doc.staff.length + 1,
    }
    patchDoc({ ...doc, staff: [...doc.staff, member] })
  }

  function addManyStaff(count: number) {
    if (readOnly) return
    const extras = Array.from({ length: count }, (_, i) => ({
      ...createEmptyStaff(doc.serviceType, doc.unitName),
      id: uid(doc.serviceType === 'enfermeria' ? 'enf' : 'med'),
      name: '',
      order: doc.staff.length + i + 1,
    }))
    patchDoc({ ...doc, staff: [...doc.staff, ...extras] })
    flash(`Agregadas ${count} filas de personal`)
    setTab('personal')
  }

  async function handleSave() {
    const current = docRefApp.current
    const named = current.staff.filter((s) => s.name.trim().length > 0).length
    if (named < 1) {
      flash('Escriba al menos 1 nombre de médico/personal antes de guardar')
      setHighlightNames(true)
      setTab('horario')
      return
    }
    setSaving(true)
    try {
      const savedDoc = await persistSchedule(current, user)
      setDoc(savedDoc)
      setDirty(false)
      setAutoSavedAt(
        new Date().toLocaleTimeString('es-EC', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      )
      await refreshList()
      flash(
        isRemoteEnabled()
          ? 'Horario guardado en servidor (Supabase)'
          : 'Horario guardado en este navegador',
      )
    } catch (e) {
      const local = saveSchedule(current)
      setDoc(local)
      setDirty(false)
      await refreshList()
      flash(
        e instanceof Error
          ? `Guardado local OK · remoto: ${e.message}`
          : 'Error al guardar en servidor',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        const prev = undoStack.current.pop()
        setUndoCount(undoStack.current.length)
        if (!prev) return
        setDoc(prev)
        setDirty(true)
        setToast('Cambio deshecho')
        window.setTimeout(() => setToast(''), 2400)
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void handleSaveRef.current()
      }

      // Atajos de claves (sin modificadores)
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const raw = e.key.toUpperCase()
      const service = docRefApp.current.serviceType
      const candidates =
        service === 'enfermeria'
          ? ['D1', 'N1', 'A1', 'A2', 'L', 'F', 'V', 'M', 'T']
          : ['CE', 'X', 'PT1', 'PT2', 'L', 'F', 'V', 'HA', 'HD']
      // Preferir coincidencia exacta de 2 chars si el usuario pulsa rápido no aplica;
      // mapear teclas simples frecuentes:
      const map: Record<string, string> = {
        L: 'L',
        F: 'F',
        V: 'V',
        X: 'X',
        C: 'CE',
        D: 'D1',
        N: 'N1',
        M: service === 'enfermeria' ? 'M' : 'CE',
        T: service === 'enfermeria' ? 'T' : 'PT1',
        P: 'PT2',
        H: 'HA',
      }
      const code = map[raw]
      if (code && shiftMeta(service, code) && candidates.includes(code)) {
        e.preventDefault()
        pickCode(code)
        setToast(`Clave ${code}`)
        window.setTimeout(() => setToast(''), 1200)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function handleLoad(id: string) {
    try {
      const loaded = await loadAnySchedule(id)
      if (!loaded) {
        flash('No se pudo cargar el horario')
        return
      }
      setDoc(loaded)
      undoStack.current = []
      setUndoCount(0)
      setDirty(false)
      setActiveCode(
        shiftsFor(loaded.serviceType).find((s) => s.group === 'turno')?.code ??
          '',
      )
      setTab('horario')
      flash('Horario cargado')
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Error al cargar')
    }
  }

  async function handleDeleteSaved(id: string) {
    if (!window.confirm('¿Eliminar este horario del navegador y del servidor?')) {
      return
    }
    deleteSchedule(id)
    try {
      if (isRemoteEnabled()) await deleteRemoteSchedule(id)
      flash('Horario eliminado')
    } catch (e) {
      flash(
        e instanceof Error
          ? `Eliminado local · remoto: ${e.message}`
          : 'Eliminado solo en navegador',
      )
    }
    await refreshList()
  }

  async function handleExport() {
    try {
      await exportScheduleExcel(doc)
      flash('Excel exportado (HORARIO, CLAVES, DISTRIBUCION, IMPRIMIR)')
    } catch {
      flash('Error al exportar Excel')
    }
  }

  function handleExportCsv() {
    try {
      downloadScheduleCsv(doc)
      flash('CSV exportado')
    } catch {
      flash('Error al exportar CSV')
    }
  }

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-line/80 bg-navy text-white">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo_msp.png"
              alt="Ministerio de Salud Pública"
              className="h-11 w-auto rounded bg-white p-1"
            />
            <div>
              <p className="font-display text-lg leading-tight sm:text-xl">
                Hospital General Puyo
              </p>
              <p className="text-xs text-white/70">
                Sistema de horarios · Claves oficiales · MSP Ecuador
                {isRemoteEnabled() ? ' · Supabase' : ' · Local'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AuthBar
              user={user}
              onLogin={(u) => {
                setUser(u)
                setShowCreate(isJefeRole(u.role) && saved.length === 0)
                flash(`Sesión: ${u.name}`)
              }}
              onLogout={() => {
                logout()
                setUser(null)
                setShowCreate(false)
                flash('Sesión cerrada')
              }}
            />
            {canCreate && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="rounded-lg bg-teal-soft px-3 py-2 text-sm font-bold text-navy-deep hover:brightness-105"
              >
                + Crear horario
              </button>
            )}
            {(!user || isJefeRole(user.role)) && (
              <button
                type="button"
                disabled={saving || readOnly}
                onClick={() => void handleSave()}
                className="rounded-lg border border-white/25 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setTab('imprimir')
                // Esperar montaje/escala de la planilla a 1 hoja
                window.setTimeout(() => window.print(), 180)
              }}
              className="rounded-lg border border-white/25 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              Imprimir / PDF
            </button>
            <button
              type="button"
              onClick={() => void handleExport()}
              className="rounded-lg border border-white/25 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              Exportar Excel
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded-lg border border-white/25 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              Exportar CSV
            </button>
          </div>
        </div>
      </header>

      {toast && (
        <div className="no-print fixed bottom-4 right-4 z-50 rounded-lg bg-navy px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      <RoleModeBanner user={user} doc={doc} canEdit={!readOnly} />

      <main className="mx-auto max-w-[1700px] px-3 py-4 sm:px-6 sm:py-6">
        {/* Checklist operativo */}
        <section className="no-print mb-4 rounded-2xl border border-line bg-white/90 p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Pasos del mes
          </p>
          <ol className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
            {(
              [
                [!!user, '1. Entrar (Jefe)'],
                [saved.length > 0 || namedStaff > 0, '2. Crear horario'],
                [staffOk, '3. Nombres médicos'],
                [Object.keys(doc.cells).length > 0, '4. Pintar turnos'],
                [doc.status !== 'BORRADOR', '5. Enviar / aprobar'],
              ] as const
            ).map(([done, label]) => (
              <li
                key={label}
                className={`rounded-lg border px-3 py-2 ${
                  done
                    ? 'border-teal/40 bg-teal/10 font-semibold text-navy'
                    : 'border-line bg-sand/40 text-muted'
                }`}
              >
                {done ? '✓ ' : '○ '}
                {label}
              </li>
            ))}
          </ol>
        </section>

        {/* Banner crear + estado de personal */}
        <section className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal/30 bg-teal/5 px-4 py-3">
          <div>
            <p className="font-display text-lg text-navy">
              {doc.unitName} · {MONTHS_ES[doc.month - 1]} {doc.year}
            </p>
            <p className="text-sm text-muted">
              Personal en este horario:{' '}
              <strong className="text-navy">{namedStaff}</strong> con nombre ·{' '}
              <strong>{doc.staff.length}</strong> filas
              {emptySlots > 0 ? ` · ${emptySlots} por completar` : ''}
              {!staffOk && (
                <span className="ml-2 font-semibold text-red-700">
                  Debe constar al menos 1 especialista
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canCreate && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep"
              >
                + Crear horario nuevo
              </button>
            )}
            {canCreate && !readOnly && (
              <button
                type="button"
                onClick={() => {
                  setTab('horario')
                  setHighlightNames(true)
                  flash('Escriba los nombres en la lista de abajo')
                  window.setTimeout(() => setHighlightNames(false), 5000)
                }}
                className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
              >
                Editar nombres
              </button>
            )}
            {!readOnly && (
              <>
                <button
                  type="button"
                  onClick={() => addManyStaff(1)}
                  className="rounded-lg border border-line bg-white px-3 py-2 text-sm hover:bg-sand"
                >
                  + 1 personal
                </button>
                <button
                  type="button"
                  onClick={() => addManyStaff(5)}
                  className="rounded-lg border border-line bg-white px-3 py-2 text-sm hover:bg-sand"
                >
                  + 5 personal
                </button>
              </>
            )}
          </div>
        </section>

        <section className="no-print mb-4 grid gap-3 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-line bg-white/85 p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Tipo de horario
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(['enfermeria', 'medico'] as ServiceType[]).map((t) => {
                const active = doc.serviceType === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => switchService(t)}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-teal bg-teal text-white shadow'
                        : 'border-line bg-sand/50 hover:border-teal/40'
                    }`}
                  >
                    <p className="font-display text-lg">{SERVICE_LABEL[t]}</p>
                    <p
                      className={`text-xs ${active ? 'text-white/80' : 'text-muted'}`}
                    >
                      {t === 'enfermeria'
                        ? 'Plantilla Gestión de Enfermería'
                        : 'Cuadro de trabajo médico'}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white/85 p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Período y servicio
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <label className="text-xs text-muted">
                Mes
                <select
                  disabled={readOnly}
                  className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-2 text-sm disabled:opacity-70"
                  value={doc.month}
                  onChange={(e) =>
                    patchDoc({ ...doc, month: Number(e.target.value) })
                  }
                >
                  {MONTHS_ES.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-muted">
                Año
                <input
                  type="number"
                  disabled={readOnly}
                  className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-2 text-sm disabled:opacity-70"
                  value={doc.year}
                  onChange={(e) =>
                    patchDoc({
                      ...doc,
                      year: Number(e.target.value) || doc.year,
                    })
                  }
                />
              </label>
              <label className="col-span-2 text-xs text-muted sm:col-span-1">
                Servicio
                <select
                  disabled={readOnly}
                  className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-2 text-sm disabled:opacity-70"
                  value={doc.unitName}
                  onChange={(e) =>
                    patchDoc({ ...doc, unitName: e.target.value })
                  }
                >
                  {units.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-2 text-xs text-muted sm:col-span-3">
                Jefe / líder de servicio
                <input
                  disabled={readOnly}
                  className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-2 text-sm disabled:opacity-70"
                  value={doc.jefeServicio}
                  onChange={(e) =>
                    patchDoc({ ...doc, jefeServicio: e.target.value })
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={doc.llamado}
                  onChange={(e) =>
                    patchDoc({ ...doc, llamado: e.target.checked })
                  }
                />
                Llamado
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={doc.vacacionesFlag}
                  onChange={(e) =>
                    patchDoc({ ...doc, vacacionesFlag: e.target.checked })
                  }
                />
                Vacaciones (mes)
              </label>
              <label className="col-span-2 text-xs text-muted sm:col-span-3">
                Cobertura mínima (personas / horas día)
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    min={0}
                    disabled={readOnly}
                    className="w-24 rounded-lg border border-line px-2 py-1.5 text-sm"
                    value={doc.coverageRule.minStaffPerDay}
                    onChange={(e) =>
                      patchDoc({
                        ...doc,
                        coverageRule: {
                          ...doc.coverageRule,
                          minStaffPerDay: Number(e.target.value) || 0,
                        },
                      })
                    }
                  />
                  <input
                    type="number"
                    min={0}
                    disabled={readOnly}
                    className="w-24 rounded-lg border border-line px-2 py-1.5 text-sm"
                    value={doc.coverageRule.minHoursPerDay}
                    onChange={(e) =>
                      patchDoc({
                        ...doc,
                        coverageRule: {
                          ...doc.coverageRule,
                          minHoursPerDay: Number(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
              </label>
            </div>
          </div>
        </section>

        {!readOnly && (
          <ToolsToolbar
            primary={[
              {
                id: 'undo',
                label: `Deshacer (${undoCount})`,
                disabled: undoCount === 0,
                title: 'Ctrl+Z',
                onClick: undoLast,
              },
              {
                id: 'dup-prev',
                label: 'Duplicar mes anterior',
                disabled: readOnly,
                onClick: () => {
                  void (async () => {
                    const next = await duplicatePreviousMonth(doc)
                    patchDoc(next)
                    const failed =
                      next.audit.at(-1)?.action === 'duplicar_mes_fallido'
                    flash(
                      failed
                        ? 'No hay mes anterior guardado para este servicio'
                        : 'Mes anterior duplicado (personal y turnos)',
                    )
                  })()
                },
              },
              {
                id: 'copy-week',
                label: 'Copiar 1ª semana al mes',
                disabled: readOnly,
                emphasis: 'teal',
                onClick: () => {
                  const next = copyFirstWeekPattern(doc)
                  if (next === doc) {
                    flash(
                      'Pinte primero la semana 1 (días 1–7); no hay vacíos que completar',
                    )
                    return
                  }
                  patchDoc(next)
                  flash('Patrón de la 1ª semana copiado al resto del mes')
                },
              },
              {
                id: 'next-month',
                label: 'Crear mes siguiente',
                emphasis: 'navy',
                onClick: () => {
                  const next = createNextMonthDraft(doc)
                  undoStack.current = []
                  setUndoCount(0)
                  setDoc(next)
                  setDirty(true)
                  setTab('horario')
                  flash(
                    `Borrador ${next.month}/${next.year} creado con el mismo personal`,
                  )
                },
              },
            ]}
            groups={[
              {
                title: 'Completar celdas',
                items: [
                  {
                    id: 'clear',
                    label: 'Limpiar mes',
                    disabled: readOnly,
                    onClick: () => {
                      if (
                        window.confirm(
                          '¿Limpiar todas las celdas del mes? Se mantiene el personal.',
                        )
                      ) {
                        patchDoc(clearMonthCells(doc))
                        flash('Mes limpiado')
                      }
                    },
                  },
                  {
                    id: 'holidays',
                    label: 'Autocompletar feriados',
                    disabled: readOnly,
                    onClick: () => {
                      patchDoc(applyHolidaysToEmptyCells(doc))
                      flash('Feriados aplicados en celdas vacías')
                    },
                  },
                  {
                    id: 'weekends',
                    label: 'Llenar sáb/dom con L',
                    disabled: readOnly,
                    onClick: () => {
                      const next = fillEmptyWeekendsWithLibre(doc)
                      if (next === doc) {
                        flash('No hay sáb/dom vacíos para marcar L')
                        return
                      }
                      patchDoc(next)
                      flash('Fines de semana vacíos marcados con L')
                    },
                  },
                  {
                    id: 'habitual',
                    label: 'Código habitual (lun–vie)',
                    disabled: readOnly,
                    onClick: () => {
                      const next = applyHabitualCodesToEmpty(doc)
                      if (next === doc) {
                        flash(
                          'Nada que completar (revise códigos habituales o ya está lleno)',
                        )
                        return
                      }
                      patchDoc(next)
                      flash(
                        'Vacíos de lun–vie completados con código habitual',
                      )
                    },
                  },
                  ...(doc.serviceType === 'medico'
                    ? [
                        {
                          id: 'post-guard',
                          label: 'L tras guardia',
                          disabled: readOnly,
                          onClick: () => {
                            const next = applyPostGuardLibre(doc)
                            if (next === doc) {
                              flash('No hay días vacíos tras guardia X/PT2/GD')
                              return
                            }
                            patchDoc(next)
                            flash('L aplicado tras guardias (celdas vacías)')
                          },
                        },
                      ]
                    : []),
                  ...(doc.serviceType === 'enfermeria'
                    ? [
                        {
                          id: 'swap-dn',
                          label: 'Intercambiar D1 ↔ N1',
                          disabled: readOnly,
                          onClick: () => {
                            if (
                              !window.confirm(
                                '¿Intercambiar todas las claves D1 ↔ N1 del mes?',
                              )
                            )
                              return
                            const next = swapCodesInSchedule(doc, 'D1', 'N1')
                            if (next === doc) {
                              flash('No hay D1/N1 para intercambiar')
                              return
                            }
                            patchDoc(next)
                            flash('D1 ↔ N1 intercambiados')
                          },
                        },
                      ]
                    : []),
                ],
              },
              {
                title: 'Personal y copias',
                items: [
                  {
                    id: 'copy-names',
                    label: 'Copiar nombres del mes anterior',
                    disabled: readOnly,
                    onClick: () => {
                      void (async () => {
                        const res = await copyStaffFromPreviousMonth(doc)
                        if (!res.ok) {
                          flash(res.error)
                          return
                        }
                        patchDoc({ ...doc, staff: res.staff, cells: {} })
                        setHighlightNames(true)
                        flash(
                          `Copiados ${res.staff.length} nombres del mes anterior. Ajuste turnos.`,
                        )
                      })()
                    },
                  },
                  {
                    id: 'dup-new',
                    label: 'Duplicar como nuevo',
                    onClick: () => {
                      const next = duplicateScheduleAsNew(doc)
                      undoStack.current = []
                      setUndoCount(0)
                      setDoc(next)
                      setDirty(true)
                      flash('Copia del horario creada como borrador nuevo')
                    },
                  },
                ],
              },
            ]}
            extras={
              <>
                <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={highlightEmpty}
                    onChange={(e) => setHighlightEmpty(e.target.checked)}
                  />
                  Resaltar vacíos
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={compactTable}
                    onChange={(e) => setCompactTable(e.target.checked)}
                  />
                  Compacto
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm">
                  Ir al día
                  <input
                    type="number"
                    min={1}
                    max={daysInMonth(doc.year, doc.month)}
                    value={jumpDay}
                    onChange={(e) => setJumpDay(Number(e.target.value) || 1)}
                    className="w-14 rounded border border-line px-1 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const max = daysInMonth(doc.year, doc.month)
                      const d = Math.min(Math.max(1, jumpDay), max)
                      setFocusDay(d)
                      setTab('horario')
                      flash(`Enfocado día ${d}`)
                    }}
                    className="rounded bg-navy px-2 py-1 text-xs font-semibold text-white"
                  >
                    Ir
                  </button>
                </label>
                <span className="self-center text-xs text-muted">
                  {dirty
                    ? 'Cambios sin guardar… (auto en 12s)'
                    : autoSavedAt
                      ? `Autoguardado ${autoSavedAt}`
                      : 'Ctrl+S guarda'}
                </span>
              </>
            }
          />

        )}

        <MonthSummary doc={doc} />

        <ShortcutsHelp open={helpOpen} onToggle={() => setHelpOpen((v) => !v)} />

        <AlertsBanner
          doc={doc}
          onGoDistribution={() => setTab('distribucion')}
          onGoContingency={() => setTab('contingencia')}
        />

        <NotesPanel doc={doc} readOnly={readOnly} onChange={patchDoc} />

        {(tab === 'horario' || tab === 'claves') && (
          <CodeUsageBar
            doc={doc}
            onPickCode={(code) => {
              pickCode(code)
              setTab('horario')
            }}
          />
        )}

        {tab === 'horario' && (
          <>
            <EmptyCellsPanel
              doc={doc}
              readOnly={readOnly}
              activeCode={activeCode}
              onChange={patchDoc}
              onFlash={flash}
            />
            <ReplaceCodePanel
              doc={doc}
              readOnly={readOnly}
              onChange={patchDoc}
              onFlash={flash}
            />
          </>
        )}

        <SchedulesHome
          items={visibleSaved}
          remote={isRemoteEnabled()}
          loading={listLoading}
          canCreate={canCreate}
          canDelete={canDeleteSaved}
          defaultStatus={listDefaultStatus}
          title={
            user && isRevisorRole(user.role) && user.role !== 'admin'
              ? 'Horarios por revisar'
              : user && isValidadorRole(user.role) && user.role !== 'admin'
                ? 'Horarios por validar'
                : 'Mis horarios'
          }
          onCreate={() => setShowCreate(true)}
          onRefresh={() => void refreshList()}
          onOpen={(id) => void handleLoad(id)}
          onDelete={(id) => void handleDeleteSaved(id)}
        />

        <ApprovalPanel
          doc={doc}
          user={user}
          onChange={(d) => {
            setDoc(d)
            void persistSchedule(d, user)
              .then(() => refreshList())
              .catch(() => {
                saveSchedule(d)
                void refreshList()
              })
          }}
          onFlash={flash}
        />

        {(!user || isJefeRole(user.role)) && doc.status === 'BORRADOR' && (
          <SubmissionChecklist
            doc={doc}
            onGoFix={(hint) => {
              if (hint === 'personal') setTab('personal')
              else if (hint === 'contingencia') setTab('contingencia')
              else if (hint === 'distribucion') setTab('distribucion')
              else setTab('horario')
            }}
          />
        )}

        <AuditTrail doc={doc} />

        <div className="no-print mb-3 flex flex-wrap gap-1">
          {(
            [
              ['horario', 'HORARIO'],
              ['claves', 'CLAVES'],
              ['distribucion', 'DISTRIBUCIÓN'],
              ['contingencia', 'CONTINGENCIA'],
              ['personal', 'PERSONAL'],
              ['imprimir', 'IMPRIMIR'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-t-lg border border-b-0 px-4 py-2 text-sm font-semibold ${
                tab === id
                  ? 'border-line bg-white text-navy'
                  : 'border-transparent bg-sand/60 text-muted hover:bg-white/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'personal' && (
          <>
            <NamesEditor
              doc={doc}
              readOnly={readOnly}
              onChange={patchDoc}
              highlight={highlightNames}
            />
            <ScheduleStaffEditor
              doc={doc}
              readOnly={readOnly}
              onChange={patchDoc}
              onFlash={flash}
            />
            <StaffManager
              serviceType={doc.serviceType}
              unitName={doc.unitName}
              onFlash={flash}
              onLoadIntoSchedule={(staff) => {
                if (readOnly) {
                  flash('Horario bloqueado')
                  return
                }
                if (staff.length < 1) {
                  flash('La biblioteca no tiene personal activo')
                  return
                }
                patchDoc({
                  ...doc,
                  staff: cloneStaffForSchedule(staff),
                })
                setTab('horario')
                flash(`Cargados ${staff.length} al horario`)
              }}
            />
          </>
        )}

        {(tab === 'horario' || tab === 'claves') && (
          <ShiftPalette
            serviceType={doc.serviceType}
            activeCode={activeCode}
            claveTab={claveTab}
            paintMode={paintMode}
            showTable={tab === 'claves'}
            recentCodes={recentCodes}
            onActiveCode={pickCode}
            onClaveTab={setClaveTab}
            onPaintMode={setPaintMode}
            onGoHorario={
              tab === 'claves' ? () => setTab('horario') : undefined
            }
          />
        )}

        {tab === 'distribucion' && (
          <>
            <DistributionPanel
              doc={doc}
              onPaintDay={(day) => {
                setTab('horario')
                setPaintMode(true)
                flash(
                  `Día ${day}: seleccione clave y clic en la cabecera del día para pintar la columna`,
                )
              }}
            />
            <StaffHoursPanel doc={doc} />
            <MonthComparePanel doc={doc} />
          </>
        )}

        {tab === 'contingencia' && (
          <ContingencyPanel
            doc={doc}
            readOnly={readOnly}
            onChange={patchDoc}
            onFlash={flash}
          />
        )}

        {tab === 'horario' && (
          <>
            <NamesEditor
              doc={doc}
              readOnly={readOnly}
              onChange={patchDoc}
              highlight={highlightNames}
            />
            <ScheduleTable
              doc={doc}
              readOnly={readOnly}
              paintMode={paintMode}
              activeCode={activeCode}
              highlightEmpty={highlightEmpty}
              compact={compactTable}
              focusDay={focusDay}
              onChange={patchDoc}
              onAddStaff={addStaff}
              onNewDemo={() =>
                setDoc(
                  createBlankSchedule(doc.serviceType, doc.year, doc.month),
                )
              }
            />
          </>
        )}

        {/* Siempre montada: en pantalla solo en pestaña Imprimir; al imprimir siempre 1 hoja */}
        <div
          className={
            tab === 'imprimir' ? undefined : 'print-sheet-offscreen'
          }
          aria-hidden={tab !== 'imprimir'}
        >
          <PrintSheet doc={doc} />
        </div>

        {/* Vista móvil: resumen consultable */}
        <section className="no-print mt-4 rounded-2xl border border-line bg-white/85 p-4 shadow-sm md:hidden">
          <h2 className="font-display text-lg text-navy">Consulta móvil</h2>
          <p className="mb-2 text-xs text-muted">
            Edición completa recomendada en escritorio. Resumen del mes:
          </p>
          <ul className="mb-3 space-y-1 text-sm">
            <li>
              <strong>{doc.unitName}</strong> · {MONTHS_ES[doc.month - 1]}{' '}
              {doc.year}
            </li>
            <li>
              Personal: {doc.staff.filter((s) => s.name.trim()).length}
            </li>
            <li>Estado: {STATUS_LABEL[doc.status]}</li>
            <li>Jefe: {doc.jefeServicio || '—'}</li>
          </ul>
          <label className="mb-2 block text-xs text-muted">
            Ver quién trabaja el día
            <input
              type="number"
              min={1}
              max={daysInMonth(doc.year, doc.month)}
              value={jumpDay}
              onChange={(e) => setJumpDay(Number(e.target.value) || 1)}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
            />
          </label>
          <ul className="space-y-1 text-sm">
            {assignmentsOnDay(
              doc,
              Math.min(
                Math.max(1, jumpDay),
                daysInMonth(doc.year, doc.month),
              ),
            ).map((a) => (
              <li
                key={`${a.staffId}-${a.code}`}
                className="flex justify-between gap-2 rounded border border-line px-2 py-1"
              >
                <span>
                  {a.fun} {a.name}
                </span>
                <strong>{a.code}</strong>
              </li>
            ))}
            {assignmentsOnDay(
              doc,
              Math.min(
                Math.max(1, jumpDay),
                daysInMonth(doc.year, doc.month),
              ),
            ).length === 0 && (
              <li className="text-muted">Sin asignaciones ese día.</li>
            )}
          </ul>
        </section>

        <p className="no-print mt-4 text-center text-xs text-muted">
          Horarios HGP · HORARIO · CLAVES · DISTRIBUCIÓN · CONTINGENCIA · PERSONAL
          · IMPRIMIR
        </p>
      </main>

      <CreateScheduleWizard
        open={showCreate && canCreate}
        defaultMonth={doc.month}
        defaultYear={doc.year}
        onClose={() => setShowCreate(false)}
        onCreate={(next) => {
          setDoc(next)
          setActiveCode(
            shiftsFor(next.serviceType).find((s) => s.group === 'turno')
              ?.code ?? '',
          )
          setClaveTab('todas')
          setTab('horario')
          setHighlightNames(true)
          flash(
            `Horario creado: ${next.unitName}. Escriba los nombres de los médicos/personal abajo.`,
          )
          window.setTimeout(() => setHighlightNames(false), 8000)
        }}
      />
    </div>
  )
}
