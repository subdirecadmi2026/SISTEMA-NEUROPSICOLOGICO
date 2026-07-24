import { beforeEach, describe, expect, it } from 'vitest'
import { SHIFTS_MEDICO, UNITS_MEDICO } from '../data/templates'
import {
  createEmptyStaff,
  listStaff,
  renameStaffLibraryUnit,
  saveStaffList,
} from './staffLibrary'
import { habitualTurnoOptions } from './staffOptions'

const STAFF_KEY = 'hgp-staff-library-v1'

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

describe('configuración médicos', () => {
  beforeEach(() => {
    installMemoryStorage()
  })

  it('ofrece solo turnos productivos como clave habitual', () => {
    const opts = habitualTurnoOptions('medico')
    expect(opts.every((s) => s.group === 'turno' && s.hours > 0)).toBe(true)
    expect(opts.some((s) => s.code === 'X' && s.hours === 24)).toBe(true)
    expect(opts.some((s) => s.code === 'HE' && s.hours === 13)).toBe(true)
    expect(opts.some((s) => s.code === 'H')).toBe(false)
    expect(opts.some((s) => s.code === 'V')).toBe(false)
  })

  it('incluye calamidad CD y unidades UCI/Neonatología en catálogo', () => {
    expect(SHIFTS_MEDICO.some((s) => s.code === 'CD')).toBe(true)
    expect(UNITS_MEDICO).toContain('UCI / Cuidados intensivos')
    expect(UNITS_MEDICO).toContain('Neonatología')
  })

  it('migra biblioteca al renombrar especialidad', () => {
    const a = createEmptyStaff('medico', 'Cirugía')
    a.name = 'Dr. Pérez'
    a.codigoPersonal = 'X'
    saveStaffList('medico', 'Cirugía', [a])
    renameStaffLibraryUnit('medico', 'Cirugía', 'Cirugía general')
    expect(listStaff('medico', 'Cirugía')).toHaveLength(0)
    const moved = listStaff('medico', 'Cirugía general')
    expect(moved).toHaveLength(1)
    expect(moved[0].name).toBe('Dr. Pérez')
    expect(moved[0].serviceUnit).toBe('Cirugía general')
    expect(localStorage.getItem(STAFF_KEY)).toBeTruthy()
  })
})
