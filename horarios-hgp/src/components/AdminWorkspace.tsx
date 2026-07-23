import { useEffect, useMemo, useState } from 'react'
import type {
  AppUser,
  SavedIndexItem,
  ScheduleDoc,
  ServiceType,
  UserRole,
} from '../types'
import { MONTHS_ES, ROLE_LABEL, STATUS_LABEL } from '../types'
import {
  DEMO_PASSWORD,
  roleLabel,
  transitionStatus,
  userInitials,
} from '../lib/auth'
import {
  ALL_ROLES,
  type ManagedUser,
  deleteManagedUser,
  listManagedUsers,
  restoreDemoUsers,
  upsertManagedUser,
} from '../lib/usersStore'
import {
  addUnit,
  listUnits,
  removeUnit,
  renameUnit,
  resetUnitsToDefaults,
} from '../lib/unitsStore'
import {
  clearStaffLibraryBucket,
  listStaffLibraryBuckets,
} from '../lib/staffLibrary'
import { SchedulesHome } from './SchedulesHome'
import { StaffManager } from './StaffManager'
import { AdminClavesPanel } from './AdminClavesPanel'
import { AdminFeriadosPanel } from './AdminFeriadosPanel'
import { shiftsFor } from '../lib/shiftsStore'

type TabId =
  | 'resumen'
  | 'perfiles'
  | 'horarios'
  | 'especialidades'
  | 'claves'
  | 'personal'
  | 'feriados'

type Props = {
  user: AppUser
  items: SavedIndexItem[]
  loading?: boolean
  remote: boolean
  onFlash: (msg: string) => void
  onRefresh: () => void
  onOpenSchedule: (id: string) => void
  onDeleteSchedule: (id: string) => void | Promise<void>
  onCreateSchedule: () => void
  onReopenSchedule: (id: string) => void | Promise<void>
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'perfiles', label: 'Perfiles' },
  { id: 'especialidades', label: 'Especialidades' },
  { id: 'claves', label: 'Claves' },
  { id: 'horarios', label: 'Horarios' },
  { id: 'personal', label: 'Personal' },
  { id: 'feriados', label: 'Feriados' },
]

const emptyUserForm = () => ({
  id: '' as string,
  name: '',
  email: '',
  role: 'lider_servicio' as UserRole,
  serviceUnitsText: '',
  password: '',
})

/**
 * Consola del administrador: crear / editar / eliminar usuarios,
 * horarios, servicios, personal de biblioteca y feriados.
 */
export function AdminWorkspace({
  user,
  items,
  loading,
  remote,
  onFlash,
  onRefresh,
  onOpenSchedule,
  onDeleteSchedule,
  onCreateSchedule,
  onReopenSchedule,
}: Props) {
  const [tab, setTab] = useState<TabId>('resumen')
  const [users, setUsers] = useState<ManagedUser[]>(() => listManagedUsers())
  const [form, setForm] = useState(emptyUserForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [unitType, setUnitType] = useState<ServiceType>('medico')
  const [units, setUnits] = useState(() => listUnits('medico'))
  const [newUnit, setNewUnit] = useState('')
  const [renameFrom, setRenameFrom] = useState('')
  const [renameTo, setRenameTo] = useState('')
  const [staffType, setStaffType] = useState<ServiceType>('medico')
  const [staffUnit, setStaffUnit] = useState('')
  const [staffTick, setStaffTick] = useState(0)
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear())

  function refreshUsers() {
    setUsers(listManagedUsers())
  }

  function refreshUnits(t = unitType) {
    setUnits(listUnits(t))
  }

  useEffect(() => {
    refreshUnits(unitType)
  }, [unitType])

  useEffect(() => {
    const opts = listUnits(staffType)
    setStaffUnit((prev) => (opts.includes(prev) ? prev : opts[0] ?? ''))
  }, [staffType, staffTick])

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {}
    for (const i of items) {
      const s = i.status ?? 'BORRADOR'
      byStatus[s] = (byStatus[s] ?? 0) + 1
    }
    return {
      users: users.length,
      schedules: items.length,
      byStatus,
      unitsMed: listUnits('medico').length,
      unitsEnf: listUnits('enfermeria').length,
      clavesMed: shiftsFor('medico').length,
      clavesEnf: shiftsFor('enfermeria').length,
      staffBuckets: listStaffLibraryBuckets().length,
    }
  }, [users, items, unitType, staffTick])

  function startEdit(u: ManagedUser) {
    setEditingId(u.id)
    setForm({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      serviceUnitsText: u.serviceUnits.join(', '),
      password: '',
    })
    setTab('perfiles')
  }

  function saveUser() {
    try {
      const serviceUnits = form.serviceUnitsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      upsertManagedUser({
        id: editingId || undefined,
        name: form.name,
        email: form.email,
        role: form.role,
        serviceUnits,
        password: form.password || undefined,
      })
      refreshUsers()
      setForm(emptyUserForm())
      setEditingId(null)
      onFlash(editingId ? 'Usuario actualizado' : 'Usuario creado')
    } catch (e) {
      onFlash(e instanceof Error ? e.message : 'No se pudo guardar')
    }
  }

  function removeUser(id: string) {
    if (id === user.id) {
      onFlash('No puede eliminar su propia sesión activa')
      return
    }
    if (!window.confirm('¿Eliminar este usuario?')) return
    try {
      deleteManagedUser(id)
      refreshUsers()
      onFlash('Perfil eliminado')
    } catch (e) {
      onFlash(e instanceof Error ? e.message : 'No se pudo eliminar')
    }
  }

  return (
    <div className="no-print mx-auto max-w-[1400px] px-3 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">
            Consola administrativa
          </p>
          <h1 className="font-display text-2xl text-navy sm:text-3xl">
            Administrador HGP
          </h1>
          <p className="mt-1 text-sm text-muted">
            Crear perfiles, especialidades y claves; gestionar horarios,
            personal y feriados · sesión: {user.name}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setTab('horarios')
            onCreateSchedule()
          }}
          className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110"
        >
          + Nuevo horario
        </button>
      </div>

      <nav className="mb-4 flex flex-wrap gap-1 rounded-2xl border border-line bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              tab === t.id ? 'bg-navy text-white' : 'text-navy hover:bg-sand'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'resumen' && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              { label: 'Perfiles', value: counts.users, go: 'perfiles' as TabId },
              {
                label: 'Horarios',
                value: counts.schedules,
                go: 'horarios' as TabId,
              },
              {
                label: 'Servicios médico',
                value: counts.unitsMed,
                go: 'especialidades' as TabId,
              },
              {
                label: 'Servicios enfermería',
                value: counts.unitsEnf,
                go: 'especialidades' as TabId,
              },
            ] as const
          ).map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setTab(c.go)}
              className="rounded-2xl border border-line bg-white p-4 text-left shadow-sm hover:border-teal/40"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {c.label}
              </p>
              <p className="mt-1 font-display text-3xl text-navy">{c.value}</p>
            </button>
          ))}
          <div className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Horarios por estado
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(STATUS_LABEL) as Array<keyof typeof STATUS_LABEL>).map(
                (s) => (
                  <span
                    key={s}
                    className="rounded-lg border border-line bg-sand/40 px-2.5 py-1 text-xs text-navy"
                  >
                    {STATUS_LABEL[s]}: <strong>{counts.byStatus[s] ?? 0}</strong>
                  </span>
                ),
              )}
            </div>
            <p className="mt-3 text-sm text-muted">
              Claves médico: {counts.clavesMed} · enfermería: {counts.clavesEnf} ·
              bibliotecas personal: {counts.staffBuckets} · demo pass:{' '}
              <code className="rounded bg-sand px-1">{DEMO_PASSWORD}</code>
            </p>
            <button
              type="button"
              onClick={() => setTab('claves')}
              className="mt-2 text-xs font-semibold text-teal underline"
            >
              Gestionar claves →
            </button>
          </div>
        </section>
      )}

      {tab === 'perfiles' && (
        <section className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
            <h2 className="font-display text-lg text-navy">
              {editingId ? 'Editar perfil' : 'Nuevo perfil'}
            </h2>
            <div className="mt-3 space-y-2">
              <label className="block text-xs font-semibold text-muted">
                Nombre
                <input
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </label>
              <label className="block text-xs font-semibold text-muted">
                Correo
                <input
                  type="email"
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </label>
              <label className="block text-xs font-semibold text-muted">
                Rol
                <select
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      role: e.target.value as UserRole,
                    }))
                  }
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-muted">
                Servicios a cargo (separados por coma)
                <input
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                  value={form.serviceUnitsText}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      serviceUnitsText: e.target.value,
                    }))
                  }
                  placeholder="Medicina interna, Pediatría"
                />
              </label>
              <label className="block text-xs font-semibold text-muted">
                Contraseña {editingId ? '(vacío = no cambiar)' : ''}
                <input
                  type="password"
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder={DEMO_PASSWORD}
                />
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={saveUser}
                  className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white"
                >
                  {editingId ? 'Guardar cambios' : 'Crear perfil'}
                </button>
                {editingId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null)
                      setForm(emptyUserForm())
                    }}
                    className="rounded-xl border border-line px-3 py-2 text-sm font-semibold"
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg text-navy">
                Perfiles ({users.length})
              </h2>
              <button
                type="button"
                onClick={() => {
                  restoreDemoUsers()
                  refreshUsers()
                  onFlash('Usuarios demo restaurados')
                }}
                className="text-xs font-semibold text-teal underline"
              >
                Restaurar demo
              </button>
            </div>
            <ul className="max-h-[28rem] space-y-2 overflow-y-auto">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                    {userInitials(u.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy">
                      {u.name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {u.email} · {roleLabel(u.role)}
                      {u.source === 'demo' ? ' · demo' : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(u)}
                    className="rounded-lg border border-line px-2 py-1 text-xs font-semibold"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => removeUser(u.id)}
                    className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-900"
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {tab === 'horarios' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Como admin puede abrir cualquier horario (incluso cerrado),
            reabrirlo a borrador o eliminarlo.
          </div>
          <SchedulesHome
            items={items}
            remote={remote}
            loading={loading}
            canCreate
            canDelete
            title="Todos los horarios"
            onOpen={onOpenSchedule}
            onDelete={onDeleteSchedule}
            onCreate={onCreateSchedule}
            onRefresh={onRefresh}
          />
          <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
            <h3 className="font-display text-lg text-navy">
              Reabrir horarios cerrados
            </h3>
            <ul className="mt-2 space-y-1">
              {items
                .filter(
                  (i) => i.status === 'APROBADO' || i.status === 'ARCHIVADO',
                )
                .map((i) => (
                  <li
                    key={i.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm"
                  >
                    <span>
                      {i.unitName} · {MONTHS_ES[i.month - 1]} {i.year} ·{' '}
                      {STATUS_LABEL[i.status ?? 'APROBADO']}
                    </span>
                    <button
                      type="button"
                      onClick={() => void onReopenSchedule(i.id)}
                      className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Reabrir a borrador
                    </button>
                  </li>
                ))}
              {items.filter(
                (i) => i.status === 'APROBADO' || i.status === 'ARCHIVADO',
              ).length === 0 ? (
                <p className="text-sm text-muted">No hay horarios cerrados.</p>
              ) : null}
            </ul>
          </section>
        </div>
      )}

      {tab === 'especialidades' && (
        <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg text-navy">
              Especialidades / servicios
            </h2>
            <select
              className="rounded-xl border border-line px-3 py-2 text-sm"
              value={unitType}
              onChange={(e) => setUnitType(e.target.value as ServiceType)}
            >
              <option value="medico">Médico</option>
              <option value="enfermeria">Enfermería</option>
            </select>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm('¿Restablecer listas por defecto?')) return
                resetUnitsToDefaults()
                refreshUnits()
                setStaffTick((n) => n + 1)
                onFlash('Especialidades restablecidas')
              }}
              className="ml-auto text-xs font-semibold text-teal underline"
            >
              Restablecer defaults
            </button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <input
              className="min-w-[200px] flex-1 rounded-xl border border-line px-3 py-2 text-sm"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="Nombre de la nueva especialidad"
            />
            <button
              type="button"
              onClick={() => {
                try {
                  addUnit(unitType, newUnit)
                  setNewUnit('')
                  refreshUnits()
                  setStaffTick((n) => n + 1)
                  onFlash('Especialidad creada')
                } catch (e) {
                  onFlash(e instanceof Error ? e.message : 'Error')
                }
              }}
              className="rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white"
            >
              Agregar
            </button>
          </div>
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            <input
              className="rounded-xl border border-line px-3 py-2 text-sm"
              list="admin-units-list"
              value={renameFrom}
              onChange={(e) => setRenameFrom(e.target.value)}
              placeholder="Especialidad a renombrar"
            />
            <datalist id="admin-units-list">
              {units.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
            <input
              className="rounded-xl border border-line px-3 py-2 text-sm"
              value={renameTo}
              onChange={(e) => setRenameTo(e.target.value)}
              placeholder="Nuevo nombre"
            />
            <button
              type="button"
              onClick={() => {
                try {
                  renameUnit(unitType, renameFrom, renameTo)
                  setRenameFrom('')
                  setRenameTo('')
                  refreshUnits()
                  setStaffTick((n) => n + 1)
                  onFlash('Especialidad renombrada')
                } catch (e) {
                  onFlash(e instanceof Error ? e.message : 'Error')
                }
              }}
              className="rounded-xl border border-line px-3 py-2 text-sm font-semibold"
            >
              Renombrar
            </button>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {units.map((u) => (
              <li
                key={u}
                className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm"
              >
                <span className="font-medium text-navy">{u}</span>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      removeUnit(unitType, u)
                      refreshUnits()
                      setStaffTick((n) => n + 1)
                      onFlash('Especialidad eliminada')
                    } catch (e) {
                      onFlash(e instanceof Error ? e.message : 'Error')
                    }
                  }}
                  className="text-xs font-semibold text-rose-800 underline"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'claves' && <AdminClavesPanel onFlash={onFlash} />}

      {tab === 'personal' && (
        <section className="space-y-3">
          <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-xl border border-line px-3 py-2 text-sm"
                value={staffType}
                onChange={(e) => setStaffType(e.target.value as ServiceType)}
              >
                <option value="medico">Médico</option>
                <option value="enfermeria">Enfermería</option>
              </select>
              <select
                className="min-w-[200px] flex-1 rounded-xl border border-line px-3 py-2 text-sm"
                value={staffUnit}
                onChange={(e) => setStaffUnit(e.target.value)}
              >
                {listUnits(staffType).map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              {staffUnit ? (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      !window.confirm(
                        `¿Vaciar biblioteca de personal de ${staffUnit}?`,
                      )
                    )
                      return
                    clearStaffLibraryBucket(staffType, staffUnit)
                    setStaffTick((n) => n + 1)
                    onFlash('Biblioteca vaciada')
                  }}
                  className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-900"
                >
                  Vaciar biblioteca
                </button>
              ) : null}
            </div>
          </div>
          {staffUnit ? (
            <StaffManager
              key={`${staffType}:${staffUnit}:${staffTick}`}
              serviceType={staffType}
              unitName={staffUnit}
              onFlash={onFlash}
              onLoadIntoSchedule={() =>
                onFlash('Biblioteca actualizada (use un horario para cargarla)')
              }
            />
          ) : null}
          <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
            <h3 className="font-display text-lg text-navy">
              Bibliotecas existentes
            </h3>
            <ul className="mt-2 space-y-1 text-sm">
              {listStaffLibraryBuckets().map((b) => (
                <li
                  key={`${b.serviceType}:${b.unitName}`}
                  className="flex justify-between gap-2 rounded-lg border border-line px-3 py-1.5"
                >
                  <span>
                    {b.serviceType === 'medico' ? 'Médico' : 'Enfermería'} ·{' '}
                    {b.unitName}
                  </span>
                  <span className="text-muted">{b.count} personas</span>
                </li>
              ))}
              {listStaffLibraryBuckets().length === 0 ? (
                <p className="text-muted">Aún no hay personal guardado.</p>
              ) : null}
            </ul>
          </div>
        </section>
      )}

      {tab === 'feriados' && (
        <AdminFeriadosPanel
          year={holidayYear}
          onYear={setHolidayYear}
          onFlash={onFlash}
        />
      )}
    </div>
  )
}


export async function adminReopenDoc(
  doc: ScheduleDoc,
  admin: AppUser,
): Promise<ScheduleDoc> {
  const result = transitionStatus(doc, 'BORRADOR', admin)
  if (!result.ok) throw new Error(result.error)
  return result.doc
}
