import { useEffect, useRef, useState } from 'react'
import type {
  AppUser,
  ScheduleDoc,
  ServiceType,
} from './types'
import { MONTHS_ES, STATUS_LABEL, uid } from './types'
import { createBlankSchedule } from './data/demo'
import { shiftsFor } from './data/templates'
import { listUnits } from './lib/unitsStore'
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
import { assertEditable, loadSession, logout, isJefeRole, isRevisorRole, isValidadorRole, transitionStatus } from './lib/auth'
import {
  persistSchedule,
  isRemoteEnabled,
  listAllSchedules,
  loadAnySchedule,
  deleteRemoteSchedule,
} from './lib/api'
import { seedServicesIfEmpty } from './lib/seedServices'
import { AuthBar } from './components/AuthBar'
import { LoginScreen } from './components/LoginScreen'
import { AdminWorkspace } from './components/AdminWorkspace'
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
import { MonthSummary } from './components/MonthSummary'
import { CodeUsageBar } from './components/CodeUsageBar'
import { StaffHoursPanel } from './components/StaffHoursPanel'
import { MonthComparePanel } from './components/MonthComparePanel'
import { AuditTrail } from './components/AuditTrail'
import { CellAdjustModule } from './components/CellAdjustModule'
import { ToolsToolbar } from './components/ToolsToolbar'
import { SubmissionChecklist } from './components/SubmissionChecklist'
import { RoleModeBanner } from './components/RoleModeBanner'
import { countPendingForRole } from './components/RoleInbox'
import {
  ReviewCardsModule,
  workspaceModeFor,
} from './components/ReviewCardsModule'
import { ValidadorWorkspace } from './components/ValidadorWorkspace'
import { CorrectionsAlert } from './components/CorrectionsAlert'
import { ScheduleContextBar } from './components/ScheduleContextBar'
import { ConfigModule } from './components/ConfigModule'
import { EditorTabs, type EditorTabId } from './components/EditorTabs'
import {
  NotificationsBell,
  ValidationNoticeBanner,
} from './components/NotificationsBell'
import { cloneStaffForSchedule, createEmptyStaff } from './lib/staffLibrary'
import { downloadScheduleCsv } from './lib/exportCsv'
import { shiftMeta } from './data/templates'
import { assignmentsOnDay, daysInMonth } from './lib/calendar'

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
  const [tab, setTab] = useState<EditorTabId>('horario')
  const [saved, setSaved] = useState<SavedIndexItem[]>([])
  const [toast, setToast] = useState('')
  const [user, setUser] = useState<AppUser | null>(() => loadSession())
  const [adminEditorOpen, setAdminEditorOpen] = useState(false)
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
  const [jumpDay, setJumpDay] = useState(1)
  const [notifyTick, setNotifyTick] = useState(0)
  const docRefApp = useRef(doc)
  docRefApp.current = doc

  function bumpNotifications() {
    setNotifyTick((n) => n + 1)
  }

  function pickCode(code: string) {
    setActiveCode(code)
    setPaintMode(true)
    setRecentCodes((prev) =>
      [code, ...prev.filter((c) => c !== code)].slice(0, 6),
    )
  }

  const units = listUnits(doc.serviceType)
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
  const pendingCount = countPendingForRole(user, visibleSaved)
  const workspaceBase = workspaceModeFor(user)
  const workspace =
    workspaceBase === 'admin' && adminEditorOpen ? 'editor' : workspaceBase
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
      const current = docRefApp.current
      void (async () => {
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
        } catch {
          try {
            const local = saveSchedule(current)
            setDoc(local)
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
        }
      })()
    }, 12000)
    return () => window.clearTimeout(t)
  }, [dirty, doc, readOnly, user])

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
                {workspaceBase === 'admin' && !adminEditorOpen
                  ? 'Consola administrador · crear, editar y eliminar'
                  : workspace === 'revisor'
                    ? 'Módulo de revisión · solo visualización'
                    : workspace === 'validador'
                      ? 'Módulo de validación · solo visualización'
                      : workspace === 'login'
                        ? 'Acceso por perfil · Jefe · Revisor · Validador'
                        : workspaceBase === 'admin' && adminEditorOpen
                          ? 'Admin · editando horario'
                          : `Sistema de horarios · MSP Ecuador${isRemoteEnabled() ? ' · Supabase' : ' · Local'}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <NotificationsBell user={user} refreshKey={notifyTick} />
            <AuthBar
              user={user}
              pendingCount={pendingCount}
              onFlash={flash}
              onLogin={(u) => {
                setUser(u)
                setAdminEditorOpen(false)
                setShowCreate(isJefeRole(u.role) && saved.length === 0)
                const n = countPendingForRole(u, saved)
                flash(
                  n > 0
                    ? `Sesión: ${u.name} · ${n} pendiente(s)`
                    : `Sesión: ${u.name}`,
                )
              }}
              onLogout={() => {
                logout()
                setUser(null)
                setShowCreate(false)
                flash('Sesión cerrada')
              }}
            />
            {workspaceBase === 'admin' && adminEditorOpen && (
              <button
                type="button"
                onClick={() => setAdminEditorOpen(false)}
                className="rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
              >
                ← Consola admin
              </button>
            )}
            {workspace === 'editor' && canCreate && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="rounded-lg bg-teal-soft px-3 py-2 text-sm font-bold text-navy-deep hover:brightness-105"
              >
                + Crear horario
              </button>
            )}
            {workspace === 'editor' && (
              <button
                type="button"
                disabled={saving || readOnly}
                onClick={() => void handleSave()}
                className="rounded-lg border border-white/25 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            )}
            {workspace === 'editor' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setTab('imprimir')
                    window.setTimeout(() => window.print(), 450)
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
              </>
            )}
          </div>
        </div>
      </header>

      {toast && (
        <div className="no-print fixed bottom-4 right-4 z-50 rounded-lg bg-navy px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {workspace === 'login' && (
        <LoginScreen
          onLogin={(u) => {
            setUser(u)
            setShowCreate(isJefeRole(u.role) && saved.length === 0)
            const n = countPendingForRole(u, saved)
            flash(
              n > 0
                ? `Bienvenido · ${u.name} · ${n} pendiente(s)`
                : `Bienvenido · ${u.name}`,
            )
          }}
        />
      )}


      {workspaceBase === 'admin' && user && !adminEditorOpen && (
        <AdminWorkspace
          user={user}
          items={visibleSaved}
          loading={listLoading}
          remote={isRemoteEnabled()}
          onFlash={flash}
          onRefresh={() => void refreshList()}
          onCreateSchedule={() => {
            setAdminEditorOpen(true)
            setShowCreate(true)
          }}
          onOpenSchedule={(id) => {
            setAdminEditorOpen(true)
            void handleLoad(id)
          }}
          onDeleteSchedule={(id) => void handleDeleteSaved(id)}
          onReopenSchedule={async (id) => {
            try {
              const loaded = await loadAnySchedule(id)
              if (!loaded) {
                flash('No se encontró el horario')
                return
              }
              const result = transitionStatus(loaded, 'BORRADOR', user)
              if (!result.ok) {
                flash(result.error)
                return
              }
              await persistSchedule(result.doc, user)
              flash('Horario reabierto a borrador')
              await refreshList()
            } catch (e) {
              flash(e instanceof Error ? e.message : 'No se pudo reabrir')
            }
          }}
        />
      )}

      {workspace === 'revisor' && user && (
        <ReviewCardsModule
          mode="revisor"
          user={user}
          items={saved}
          loading={listLoading}
          onRefresh={() => void refreshList()}
          onFlash={flash}
          onNotify={bumpNotifications}
          onChanged={(d) => {
            void persistSchedule(d, user)
              .then(() => refreshList())
              .catch(() => {
                saveSchedule(d)
                void refreshList()
              })
          }}
        />
      )}

      {workspace === 'validador' && user && (
        <ValidadorWorkspace
          user={user}
          items={saved}
          loading={listLoading}
          onRefresh={() => void refreshList()}
          onFlash={flash}
          onNotify={bumpNotifications}
          onChanged={(d) => {
            void persistSchedule(d, user)
              .then(() => refreshList())
              .catch(() => {
                saveSchedule(d)
                void refreshList()
              })
          }}
        />
      )}

      {workspace === 'editor' && (
        <>
      <RoleModeBanner user={user} doc={doc} canEdit={!readOnly} />
      <ValidationNoticeBanner user={user} refreshKey={notifyTick} />

      <main className="mx-auto max-w-[1700px] px-3 py-4 sm:px-6 sm:py-6">
        <CorrectionsAlert
          doc={doc}
          user={user}
          canResolve={!readOnly}
          onChange={(d) => {
            setDoc(d)
            setDirty(true)
          }}
          onFlash={flash}
        />

        <ScheduleContextBar
          doc={doc}
          namedStaff={namedStaff}
          emptySlots={emptySlots}
          staffOk={staffOk}
          canCreate={canCreate}
          readOnly={readOnly}
          onCreate={() => setShowCreate(true)}
          onEditNames={() => {
            setTab('personal')
            setHighlightNames(true)
            flash('Edite los nombres en Personal')
            window.setTimeout(() => setHighlightNames(false), 5000)
          }}
          onAddStaff={(n) => addManyStaff(n)}
        />

        <ConfigModule
          doc={doc}
          readOnly={readOnly}
          units={units}
          onSwitchService={switchService}
          onPatch={patchDoc}
          notesSlot={
            <textarea
              disabled={readOnly}
              rows={4}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal disabled:opacity-70"
              value={doc.notes}
              placeholder="Observaciones del mes (impresión / archivo)…"
              onChange={(e) => patchDoc({ ...doc, notes: e.target.value })}
            />
          }
        />

        {!readOnly && (
          <ToolsToolbar
            statusHint={
              dirty
                ? 'Sin guardar (auto 12s)'
                : autoSavedAt
                  ? `Autoguardado ${autoSavedAt}`
                  : 'Ctrl+S guarda'
            }
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
                label: 'Copiar 1ª semana',
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
                label: 'Mes siguiente',
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
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-sand/40 px-3.5 py-2.5 text-sm font-medium text-navy hover:bg-sand">
                  <input
                    type="checkbox"
                    checked={highlightEmpty}
                    onChange={(e) => setHighlightEmpty(e.target.checked)}
                    className="accent-teal"
                  />
                  Resaltar vacíos
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-sand/40 px-3.5 py-2.5 text-sm font-medium text-navy hover:bg-sand">
                  <input
                    type="checkbox"
                    checked={compactTable}
                    onChange={(e) => setCompactTable(e.target.checked)}
                    className="accent-teal"
                  />
                  Vista compacta
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-line bg-sand/40 px-3.5 py-2 text-sm font-medium text-navy">
                  Ir al día
                  <input
                    type="number"
                    min={1}
                    max={daysInMonth(doc.year, doc.month)}
                    value={jumpDay}
                    onChange={(e) => setJumpDay(Number(e.target.value) || 1)}
                    className="w-14 rounded-lg border border-line bg-white px-2 py-1 text-sm"
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
                    className="rounded-lg bg-navy px-3 py-1 text-xs font-semibold text-white"
                  >
                    Ir
                  </button>
                </div>
              </>
            }
          />
        )}

        <MonthSummary doc={doc} />

        <EditorTabs tab={tab} onChange={setTab} />

        {(tab === 'horario' || tab === 'claves') && (
          <CodeUsageBar
            doc={doc}
            onPickCode={(code) => {
              pickCode(code)
              setTab('horario')
            }}
          />
        )}

        {tab === 'personal' && (
          <>
            <NamesEditor
              doc={doc}
              readOnly={readOnly}
              onChange={patchDoc}
              highlight={highlightNames}
            />
            {/* Médico: NamesEditor basta (FUN siempre MED). Enfermería: editor con secciones/FUN. */}
            {doc.serviceType === 'enfermeria' && (
              <ScheduleStaffEditor
                doc={doc}
                readOnly={readOnly}
                onChange={patchDoc}
                onFlash={flash}
              />
            )}
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
        )}

        {tab === 'horario' && !readOnly && (
          <CellAdjustModule
            doc={doc}
            readOnly={readOnly}
            activeCode={activeCode}
            onChange={patchDoc}
            onFlash={flash}
          />
        )}

        <SchedulesHome
          items={visibleSaved}
          remote={isRemoteEnabled()}
          loading={listLoading}
          canCreate={canCreate}
          canDelete={canDeleteSaved}
          defaultStatus={listDefaultStatus}
          title="Mis horarios"
          onCreate={() => setShowCreate(true)}
          onRefresh={() => void refreshList()}
          onOpen={(id) => void handleLoad(id)}
          onDelete={(id) => void handleDeleteSaved(id)}
        />

        <ApprovalPanel
          doc={doc}
          user={user}
          onNotify={bumpNotifications}
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

        {doc.status === 'BORRADOR' && (
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
        </>
      )}

      <CreateScheduleWizard
        open={showCreate && canCreate && workspace === 'editor'}
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
