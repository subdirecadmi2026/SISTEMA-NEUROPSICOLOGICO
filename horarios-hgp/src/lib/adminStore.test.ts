import { describe, expect, it, beforeEach } from 'vitest'
import {
  addUnit,
  listUnits,
  removeUnit,
  renameUnit,
  resetUnitsToDefaults,
} from './unitsStore'
import {
  deleteManagedUser,
  listManagedUsers,
  restoreDemoUsers,
  upsertManagedUser,
} from './usersStore'

function installMemoryStorage() {
  const store = new Map<string, string>()
  const memory = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v))
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: memory,
    configurable: true,
  })
}

describe('admin usersStore', () => {
  beforeEach(() => {
    installMemoryStorage()
    restoreDemoUsers()
  })

  it('crea, edita y elimina usuario custom', () => {
    const created = upsertManagedUser({
      name: 'Lic. Nueva',
      email: 'nueva@hgp.gob.ec',
      role: 'lider_servicio',
      serviceUnits: ['Pediatría'],
      password: 'secreta',
    })
    expect(listManagedUsers().some((u) => u.id === created.id)).toBe(true)
    upsertManagedUser({
      id: created.id,
      name: 'Lic. Nueva Editada',
      email: 'nueva@hgp.gob.ec',
      role: 'revisor',
      serviceUnits: [],
    })
    expect(listManagedUsers().find((u) => u.id === created.id)?.name).toBe(
      'Lic. Nueva Editada',
    )
    deleteManagedUser(created.id)
    expect(listManagedUsers().some((u) => u.id === created.id)).toBe(false)
  })

  it('no elimina el último admin', () => {
    const others = listManagedUsers().filter((u) => u.role === 'admin')
    expect(others.length).toBeGreaterThanOrEqual(1)
    // eliminar todos los no-admin no aplica; intentar borrar u-admin sin otro admin
    for (const u of listManagedUsers()) {
      if (u.role !== 'admin') deleteManagedUser(u.id)
    }
    expect(() => deleteManagedUser('u-admin')).toThrow(/último administrador/)
  })
})

describe('admin unitsStore', () => {
  beforeEach(() => {
    installMemoryStorage()
    resetUnitsToDefaults()
  })

  it('agrega, renombra y elimina servicio', () => {
    addUnit('medico', 'Oncología')
    expect(listUnits('medico')).toContain('Oncología')
    renameUnit('medico', 'Oncología', 'Oncología clínica')
    expect(listUnits('medico')).toContain('Oncología clínica')
    removeUnit('medico', 'Oncología clínica')
    expect(listUnits('medico')).not.toContain('Oncología clínica')
  })
})
