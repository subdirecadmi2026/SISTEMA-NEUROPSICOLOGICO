import { beforeEach, describe, expect, it } from 'vitest'
import { createBlankSchedule } from '../data/demo'
import { cellKey } from './calendar'
import {
  cancelLeave,
  defaultHoursPerDay,
  estimateAuthorizedHours,
  inclusiveDayCount,
  listLeaves,
  upsertLeave,
} from './leavesStore'
import {
  applyLeaveCodesToEmpty,
  computeLeaveUsage,
  validateLeaves,
} from './leaveValidation'
import { runAllValidations } from './validation'

const KEY = 'hgp-staff-leaves-v1'

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

describe('permisos / vacaciones', () => {
  beforeEach(() => {
    installMemoryStorage()
  })

  it('estima horas autorizadas por días × jornada', () => {
    expect(inclusiveDayCount('2026-07-01', '2026-07-05')).toBe(5)
    expect(estimateAuthorizedHours('2026-07-01', '2026-07-05', 8)).toBe(40)
    expect(estimateAuthorizedHours('2026-07-01', '2026-07-01', 13)).toBe(13)
    expect(estimateAuthorizedHours('2026-07-01', '2026-07-02', 24)).toBe(48)
  })

  it('usa horas de clave habitual (X=24, HE=13) y no fija 8 h', () => {
    expect(defaultHoursPerDay('medico', 'X')).toBe(24)
    expect(defaultHoursPerDay('medico', 'HE')).toBe(13)
    expect(defaultHoursPerDay('medico', 'PT1')).toBe(12)
    expect(defaultHoursPerDay('medico', 'CE')).toBe(8)
    expect(defaultHoursPerDay('enfermeria', 'D1')).toBe(12)

    const guardia = upsertLeave({
      staffId: 'med-x',
      staffName: 'Dr. Guardia',
      serviceType: 'medico',
      unitName: 'UCI',
      kind: 'permiso_temporal',
      startDate: '2026-07-10',
      endDate: '2026-07-10',
      hoursPerDay: 24,
      authorizedHours: 24,
    })
    expect(guardia.hoursPerDay).toBe(24)
    expect(guardia.authorizedHours).toBe(24)

    const he = upsertLeave({
      staffId: 'med-he',
      staffName: 'Dra. HE',
      serviceType: 'medico',
      unitName: 'UCI',
      kind: 'permiso_temporal',
      startDate: '2026-07-11',
      endDate: '2026-07-12',
      hoursPerDay: 13,
    })
    expect(he.hoursPerDay).toBe(13)
    expect(he.authorizedHours).toBe(26)
  })

  it('rechaza jornada mayor a 24 h', () => {
    expect(() =>
      upsertLeave({
        staffId: 'med-1',
        staffName: 'Dr. Pérez',
        serviceType: 'medico',
        unitName: 'Medicina Interna',
        kind: 'vacaciones',
        startDate: '2026-07-01',
        endDate: '2026-07-01',
        hoursPerDay: 25,
      }),
    ).toThrow(/1 y 24/)
  })

  it('registra permiso y lo lista por unidad', () => {
    const leave = upsertLeave({
      staffId: 'med-1',
      staffName: 'Dr. Pérez',
      serviceType: 'medico',
      unitName: 'Medicina Interna',
      kind: 'vacaciones',
      startDate: '2026-07-01',
      endDate: '2026-07-05',
      authorizedHours: 40,
      hoursPerDay: 8,
    })
    expect(leave.absenceCode).toBe('V')
    expect(listLeaves({ unitName: 'Medicina Interna' })).toHaveLength(1)
    cancelLeave(leave.id)
    expect(listLeaves({ status: 'activo' })).toHaveLength(0)
    expect(localStorage.getItem(KEY)).toBeTruthy()
  })

  it('detecta turno productivo en días de vacaciones', () => {
    upsertLeave({
      staffId: 'a',
      staffName: 'Dra. Vega',
      serviceType: 'medico',
      unitName: 'UCI',
      kind: 'vacaciones',
      startDate: '2026-07-01',
      endDate: '2026-07-03',
      authorizedHours: 24,
      hoursPerDay: 8,
    })
    const doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    doc.unitName = 'UCI'
    doc.staff = [
      {
        id: 'a',
        name: 'Dra. Vega',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'CE',
        order: 1,
      },
    ]
    doc.cells = { [cellKey('a', 1)]: 'CE', [cellKey('a', 2)]: 'V' }

    const usage = computeLeaveUsage(
      listLeaves({ unitName: 'UCI', status: 'activo' })[0],
      doc,
    )
    expect(usage.conflictDays).toContain(1)
    expect(usage.markedDays).toContain(2)
    expect(usage.usedHours).toBe(8)

    const alerts = validateLeaves(doc)
    expect(alerts.some((a) => a.code === 'permiso_conflicto_turno')).toBe(true)
    expect(runAllValidations(doc).some((a) => a.code === 'permiso_conflicto_turno')).toBe(
      true,
    )
  })

  it('detecta exceso de horas de permiso marcadas', () => {
    upsertLeave({
      staffId: 'a',
      staffName: 'Enf. Ruiz',
      serviceType: 'enfermeria',
      unitName: 'Emergencia',
      kind: 'permiso_temporal',
      startDate: '2026-07-01',
      endDate: '2026-07-10',
      authorizedHours: 16,
      hoursPerDay: 8,
      absenceCode: 'P',
    })
    const doc = createBlankSchedule('enfermeria', 2026, 7, { withDemo: false })
    doc.unitName = 'Emergencia'
    doc.staff = [
      {
        id: 'a',
        name: 'Enf. Ruiz',
        fun: 'ENF',
        role: 'Enfermera',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'D1',
        order: 1,
      },
    ]
    doc.cells = {
      [cellKey('a', 1)]: 'P',
      [cellKey('a', 2)]: 'P',
      [cellKey('a', 3)]: 'P',
    }
    const alerts = validateLeaves(doc)
    expect(alerts.some((a) => a.code === 'permiso_exceso_horas')).toBe(true)
  })

  it('aplica claves de permiso a días vacíos', () => {
    upsertLeave({
      staffId: 'a',
      staffName: 'Dr. Sol',
      serviceType: 'medico',
      unitName: 'Pediatría',
      kind: 'vacaciones',
      startDate: '2026-07-01',
      endDate: '2026-07-03',
      authorizedHours: 24,
      hoursPerDay: 8,
    })
    const doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    doc.unitName = 'Pediatría'
    doc.staff = [
      {
        id: 'a',
        name: 'Dr. Sol',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'CE',
        order: 1,
      },
    ]
    doc.cells = { [cellKey('a', 1)]: 'CE' }
    const { painted, doc: next } = applyLeaveCodesToEmpty(doc)
    expect(painted).toBe(2)
    expect(next.cells[cellKey('a', 1)]).toBe('CE')
    expect(next.cells[cellKey('a', 2)]).toBe('V')
    expect(next.cells[cellKey('a', 3)]).toBe('V')
  })

  it('detecta solapes de permisos del mismo personal', async () => {
    const { findOverlappingLeaves } = await import('./leavesStore')
    upsertLeave({
      staffId: 'a',
      staffName: 'Dr. Sol',
      serviceType: 'medico',
      unitName: 'Pediatría',
      kind: 'vacaciones',
      startDate: '2026-07-01',
      endDate: '2026-07-10',
      authorizedHours: 80,
      hoursPerDay: 8,
    })
    const overlap = findOverlappingLeaves({
      staffId: 'a',
      staffName: 'Dr. Sol',
      unitName: 'Pediatría',
      startDate: '2026-07-08',
      endDate: '2026-07-15',
    })
    expect(overlap.length).toBe(1)
  })

  it('rechaza fechas inválidas (sin rollover)', async () => {
    const { parseYmd } = await import('./leavesStore')
    expect(parseYmd('2026-02-31')).toBeNull()
    expect(parseYmd('2026-02-28')).not.toBeNull()
  })
})
