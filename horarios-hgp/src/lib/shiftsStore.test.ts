import { describe, expect, it, beforeEach } from 'vitest'
import {
  removeShift,
  resetShiftsToDefaults,
  shiftsFor,
  upsertShift,
} from './shiftsStore'

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

describe('admin shiftsStore (claves)', () => {
  beforeEach(() => {
    installMemoryStorage()
    resetShiftsToDefaults()
  })

  it('crea y elimina una clave', () => {
    const before = shiftsFor('medico').length
    upsertShift('medico', {
      code: 'ZX',
      label: 'Prueba admin',
      hours: 4,
      color: '#eee',
      text: '#111',
      group: 'turno',
    })
    expect(shiftsFor('medico').length).toBe(before + 1)
    expect(shiftsFor('medico').some((s) => s.code === 'ZX')).toBe(true)
    removeShift('medico', 'ZX')
    expect(shiftsFor('medico').some((s) => s.code === 'ZX')).toBe(false)
  })

  it('renombra código de clave', () => {
    upsertShift('enfermeria', {
      code: 'Z1',
      label: 'Temporal',
      hours: 2,
      color: '#ddd',
      group: 'area',
    })
    upsertShift(
      'enfermeria',
      {
        code: 'Z2',
        label: 'Temporal 2',
        hours: 3,
        color: '#ccc',
        group: 'area',
      },
      'Z1',
    )
    expect(shiftsFor('enfermeria').some((s) => s.code === 'Z1')).toBe(false)
    expect(shiftsFor('enfermeria').find((s) => s.code === 'Z2')?.hours).toBe(3)
  })
})
