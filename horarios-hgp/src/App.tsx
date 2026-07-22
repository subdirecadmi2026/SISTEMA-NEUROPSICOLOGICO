import { useEffect, useState } from 'react'
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
  loadSchedule,
  saveSchedule,
  type SavedIndexItem,
} from './lib/storage'
import {
  applyHolidaysToEmptyCells,
  clearMonthCells,
  duplicatePreviousMonth,
} from './lib/scheduleOps'
import { assertEditable, loadSession, logout } from './lib/auth'
import { persistSchedule, isRemoteEnabled } from './lib/api'
import { AuthBar } from './components/AuthBar'
import { StaffManager } from './components/StaffManager'
import { ApprovalPanel } from './components/ApprovalPanel'
import { DistributionPanel } from './components/DistributionPanel'
import { ContingencyPanel } from './components/ContingencyPanel'
import { ShiftPalette } from './components/ShiftPalette'
import { ScheduleTable } from './components/ScheduleTable'
import { CreateScheduleWizard } from './components/CreateScheduleWizard'
import { ScheduleStaffEditor } from './components/ScheduleStaffEditor'
import { cloneStaffForSchedule, createEmptyStaff } from './lib/staffLibrary'

type TabId = 'horario' | 'claves' | 'distribucion' | 'contingencia' | 'personal'

const now = new Date()

export default function App() {
  const [doc, setDoc] = useState<ScheduleDoc>(() =>
    createBlankSchedule('enfermeria', now.getFullYear(), now.getMonth() + 1),
  )
  const [activeCode, setActiveCode] = useState('D1')
  const [paintMode, setPaintMode] = useState(true)
  const [claveTab, setClaveTab] = useState<'turno' | 'area' | 'ausencia' | 'todas'>(
    'todas',
  )
  const [tab, setTab] = useState<TabId>('horario')
  const [saved, setSaved] = useState<SavedIndexItem[]>([])
  const [toast, setToast] = useState('')
  const [user, setUser] = useState<AppUser | null>(() => loadSession())
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const units =
    doc.serviceType === 'enfermeria' ? UNITS_ENFERMERIA : UNITS_MEDICO
  const readOnly = !assertEditable(doc, user)
  const namedStaff = doc.staff.filter((s) => s.name.trim().length > 0).length
  const emptySlots = doc.staff.length - namedStaff
  const staffOk = namedStaff >= 1

  useEffect(() => {
    setSaved(listSavedSchedules())
  }, [])

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2400)
  }

  function patchDoc(next: ScheduleDoc) {
    if (readOnly) {
      flash('Horario bloqueado (aprobado). Solo admin puede editar.')
      return
    }
    setDoc(next)
  }

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
    setSaving(true)
    try {
      const savedDoc = await persistSchedule(doc, user)
      setDoc(savedDoc)
      setSaved(listSavedSchedules())
      flash(
        isRemoteEnabled()
          ? 'Horario guardado (local + servidor)'
          : 'Horario guardado en este navegador',
      )
    } catch (e) {
      // Fallback local si remoto falla
      const local = saveSchedule(doc)
      setDoc(local)
      setSaved(listSavedSchedules())
      flash(
        e instanceof Error
          ? `Guardado local OK · remoto: ${e.message}`
          : 'Error al guardar en servidor',
      )
    } finally {
      setSaving(false)
    }
  }

  function handleLoad(id: string) {
    const loaded = loadSchedule(id)
    if (!loaded) return
    setDoc(loaded)
    setActiveCode(
      shiftsFor(loaded.serviceType).find((s) => s.group === 'turno')?.code ?? '',
    )
    flash('Horario cargado')
  }

  function handleDeleteSaved(id: string) {
    deleteSchedule(id)
    setSaved(listSavedSchedules())
    flash('Horario eliminado')
  }

  async function handleExport() {
    try {
      await exportScheduleExcel(doc)
      flash('Excel exportado (HORARIO, CLAVES, DISTRIBUCION, IMPRIMIR)')
    } catch {
      flash('Error al exportar Excel')
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
                flash(`Sesión: ${u.name}`)
              }}
              onLogout={() => {
                logout()
                setUser(null)
                flash('Sesión cerrada')
              }}
            />
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-teal-soft px-3 py-2 text-sm font-bold text-navy-deep hover:brightness-105"
            >
              + Crear horario
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="rounded-lg border border-white/25 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
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
          </div>
        </div>
      </header>

      {toast && (
        <div className="no-print fixed bottom-4 right-4 z-50 rounded-lg bg-navy px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {readOnly && (
        <div className="no-print border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
          Horario en estado <strong>{STATUS_LABEL[doc.status]}</strong> — edición
          bloqueada
          {user?.role === 'admin' ? ' (admin puede reabrir)' : ''}.
        </div>
      )}

      <main className="mx-auto max-w-[1700px] px-3 py-4 sm:px-6 sm:py-6">
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
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep"
            >
              + Crear horario nuevo
            </button>
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
                <button
                  type="button"
                  onClick={() => {
                    setTab('personal')
                    flash('Complete nombres, FUN y código de cada especialista')
                  }}
                  className="rounded-lg border border-teal bg-white px-3 py-2 text-sm font-semibold text-teal hover:bg-teal/5"
                >
                  Completar personal
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

        {/* Acciones de mes */}
        <section className="no-print mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => {
              if (
                window.confirm(
                  '¿Limpiar todas las celdas del mes? Se mantiene el personal.',
                )
              ) {
                patchDoc(clearMonthCells(doc))
                flash('Mes limpiado')
              }
            }}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm hover:bg-sand disabled:opacity-50"
          >
            Limpiar mes
          </button>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => {
              const next = duplicatePreviousMonth(doc)
              patchDoc(next)
              const failed = next.audit.at(-1)?.action === 'duplicar_mes_fallido'
              flash(
                failed
                  ? 'No hay mes anterior guardado para este servicio'
                  : 'Mes anterior duplicado',
              )
            }}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm hover:bg-sand disabled:opacity-50"
          >
            Duplicar mes anterior
          </button>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => {
              patchDoc(applyHolidaysToEmptyCells(doc))
              flash('Feriados aplicados en celdas vacías')
            }}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm hover:bg-sand disabled:opacity-50"
          >
            Autocompletar feriados
          </button>
        </section>

        {saved.length > 0 && (
          <section className="no-print mb-4 rounded-2xl border border-line bg-white/85 p-3 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Horarios guardados
            </p>
            <div className="flex flex-wrap gap-2">
              {saved.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-1 rounded-lg border border-line bg-sand/40 px-2 py-1 text-xs"
                >
                  <button
                    type="button"
                    className="font-semibold text-navy hover:underline"
                    onClick={() => handleLoad(s.id)}
                  >
                    {s.label}
                    {s.status ? ` · ${STATUS_LABEL[s.status]}` : ''}
                  </button>
                  <button
                    type="button"
                    className="text-red-700"
                    onClick={() => handleDeleteSaved(s.id)}
                    title="Eliminar"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <ApprovalPanel
          doc={doc}
          user={user}
          onChange={(d) => {
            setDoc(d)
            saveSchedule(d)
            setSaved(listSavedSchedules())
          }}
          onFlash={flash}
        />

        <div className="no-print mb-3 flex flex-wrap gap-1">
          {(
            [
              ['horario', 'HORARIO'],
              ['claves', 'CLAVES'],
              ['distribucion', 'DISTRIBUCIÓN'],
              ['contingencia', 'CONTINGENCIA'],
              ['personal', 'PERSONAL'],
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
            onActiveCode={setActiveCode}
            onClaveTab={setClaveTab}
            onPaintMode={setPaintMode}
            onGoHorario={
              tab === 'claves' ? () => setTab('horario') : undefined
            }
          />
        )}

        {tab === 'distribucion' && <DistributionPanel doc={doc} />}

        {tab === 'contingencia' && (
          <ContingencyPanel
            doc={doc}
            readOnly={readOnly}
            onChange={patchDoc}
          />
        )}

        {tab === 'horario' && (
          <ScheduleTable
            doc={doc}
            readOnly={readOnly}
            paintMode={paintMode}
            activeCode={activeCode}
            onChange={patchDoc}
            onAddStaff={addStaff}
            onNewDemo={() =>
              setDoc(
                createBlankSchedule(doc.serviceType, doc.year, doc.month),
              )
            }
          />
        )}

        {/* Vista móvil: resumen consultable */}
        <section className="no-print mt-4 rounded-2xl border border-line bg-white/85 p-4 shadow-sm md:hidden">
          <h2 className="font-display text-lg text-navy">Consulta móvil</h2>
          <p className="mb-2 text-xs text-muted">
            Edición completa recomendada en escritorio. Resumen del mes:
          </p>
          <ul className="space-y-1 text-sm">
            <li>
              <strong>{doc.unitName}</strong> · {MONTHS_ES[doc.month - 1]}{' '}
              {doc.year}
            </li>
            <li>Personal: {doc.staff.length}</li>
            <li>Estado: {STATUS_LABEL[doc.status]}</li>
            <li>Jefe: {doc.jefeServicio || '—'}</li>
          </ul>
        </section>

        <p className="no-print mt-4 text-center text-xs text-muted">
          Horarios HGP · HORARIO · CLAVES · DISTRIBUCIÓN · CONTINGENCIA · PERSONAL
        </p>
      </main>

      <CreateScheduleWizard
        open={showCreate}
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
          setTab('personal')
          flash(
            `Horario creado: ${next.unitName} · ${next.staff.length} plaza(s). Complete los nombres.`,
          )
        }}
      />
    </div>
  )
}
