import { beforeEach, describe, expect, it } from 'vitest'
import { SHIFTS_MEDICO, UNITS_MEDICO } from '../data/templates'
import {
  createEmptyStaff,
  flattenStaffLibrary,
  listStaff,
  mergeStaffLibraryEntries,
  renameStaffLibraryUnit,
  replaceAllStaffLibrary,
  saveStaffList,
  syncScheduleStaffToLibrary,
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

  it('sincroniza médicos del horario a la biblioteca', () => {
    const schedule = [
      {
        ...createEmptyStaff('medico', 'UCI'),
        name: 'Dra. Vega',
        codigoPersonal: 'X',
        role: 'Médico de planta',
      },
      {
        ...createEmptyStaff('medico', 'UCI'),
        name: 'Dr. León',
        codigoPersonal: 'HE',
      },
    ]
    const n = syncScheduleStaffToLibrary('medico', 'UCI', schedule)
    expect(n).toBe(2)
    const lib = listStaff('medico', 'UCI')
    expect(lib).toHaveLength(2)
    expect(lib.find((s) => s.name === 'Dra. Vega')?.codigoPersonal).toBe('X')
  })

  it('aplana y fusiona biblioteca por updatedAt', () => {
    const a = createEmptyStaff('medico', 'Nefrología')
    a.name = 'Dr. Admin'
    a.id = 'med-1'
    saveStaffList('medico', 'Nefrología', [a], { syncRemote: false })
    const flat = flattenStaffLibrary()
    expect(flat).toHaveLength(1)
    expect(flat[0].unitName).toBe('Nefrología')

    const remote = [
      {
        ...flat[0],
        name: 'Dr. Remoto',
        updatedAt: '2099-01-01T00:00:00.000Z',
      },
    ]
    const merged = mergeStaffLibraryEntries(flat, remote)
    expect(merged).toHaveLength(1)
    expect(merged[0].name).toBe('Dr. Remoto')
    replaceAllStaffLibrary(merged, { syncRemote: false })
    expect(listStaff('medico', 'Nefrología')[0].name).toBe('Dr. Remoto')
  })
})

describe('vacaciones / bajo llamado en cuadro', () => {
  it('marca V o BL en días vacíos según estado del médico', async () => {
    const { createBlankSchedule } = await import('../data/demo')
    const {
      applyStaffMonthStatus,
      applyScheduleFlagsToGrid,
    } = await import('./scheduleOps')

    let doc = createBlankSchedule('medico', 2026, 7, {
      withDemo: false,
      unitName: 'Medicina interna',
      staff: [
        {
          ...createEmptyStaff('medico', 'Medicina interna'),
          id: 'med-1',
          name: 'Dr. Pérez',
          codigoPersonal: 'CE',
        },
      ],
    })

    const vac = applyStaffMonthStatus(doc, 'med-1', 'vacaciones')
    expect(vac.painted).toBeGreaterThan(20)
    expect(vac.doc.cells['med-1:1']).toBe('V')

    const bl = applyStaffMonthStatus(doc, 'med-1', 'bajo_llamado')
    expect(bl.doc.cells['med-1:1']).toBe('BL')

    const flags = applyScheduleFlagsToGrid(doc, {
      vacacionesFlag: true,
      llamado: false,
    })
    expect(flags.doc.vacacionesFlag).toBe(true)
    expect(flags.doc.cells['med-1:2']).toBe('V')
  })
})
