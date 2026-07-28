import { describe, expect, it, beforeEach } from 'vitest'
import {
  clearCustomHolidays,
  deleteHoliday,
  holidaysForYear,
  restoreNationalHolidays,
  updateHoliday,
} from './holidays'

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

describe('admin feriados CRUD', () => {
  beforeEach(() => {
    installMemoryStorage()
    clearCustomHolidays()
    restoreNationalHolidays()
  })

  it('crea un feriado custom', () => {
    updateHoliday(null, {
      date: '2026-07-22',
      name: 'Aniversario HGP',
    })
    const h = holidaysForYear(2026).find((x) => x.date === '2026-07-22')
    expect(h?.name).toBe('Aniversario HGP')
    expect(h?.source).toBe('custom')
  })

  it('actualiza nombre de feriado nacional', () => {
    updateHoliday('2026-01-01', {
      date: '2026-01-01',
      name: 'Año Nuevo HGP',
    })
    const h = holidaysForYear(2026).find((x) => x.date === '2026-01-01')
    expect(h?.name).toBe('Año Nuevo HGP')
    expect(h?.source).toBe('custom')
  })

  it('elimina feriado nacional (ocultar) y lo restaura', () => {
    const before = holidaysForYear(2026).length
    deleteHoliday('2026-12-25')
    expect(
      holidaysForYear(2026).some((h) => h.date === '2026-12-25'),
    ).toBe(false)
    expect(holidaysForYear(2026).length).toBe(before - 1)
    restoreNationalHolidays(2026)
    expect(
      holidaysForYear(2026).some((h) => h.date === '2026-12-25'),
    ).toBe(true)
  })

  it('elimina feriado custom', () => {
    updateHoliday(null, { date: '2026-03-15', name: 'Prueba' })
    deleteHoliday('2026-03-15')
    expect(
      holidaysForYear(2026).some((h) => h.date === '2026-03-15'),
    ).toBe(false)
  })
})
