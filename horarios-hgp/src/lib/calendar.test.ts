import { describe, expect, it } from 'vitest'
import { createBlankSchedule } from '../data/demo'
import {
  hoursForCode,
  shiftMeta,
  SHIFTS_ENFERMERIA,
  SHIFTS_MEDICO,
} from '../data/templates'
import {
  plannedHours,
  plannedShifts,
  totalPaidHours,
  coverageByDay,
  cellKey,
} from '../lib/calendar'
import {
  validateCoverage,
  validateRestDays,
  validatePostGuard,
  canEditSchedule,
} from '../lib/validation'
import { ecuadorHolidays } from '../lib/holidays'

describe('cálculo de horas por clave', () => {
  it('enfermería: D1 y N1 = 12 h, A1 = 8 h, L = 0', () => {
    expect(hoursForCode('enfermeria', 'D1')).toBe(12)
    expect(hoursForCode('enfermeria', 'N1')).toBe(12)
    expect(hoursForCode('enfermeria', 'A1')).toBe(8)
    expect(hoursForCode('enfermeria', 'E5')).toBe(4)
    expect(hoursForCode('enfermeria', 'L')).toBe(0)
    expect(hoursForCode('enfermeria', 'V')).toBe(0)
  })

  it('médico: X = 24, PT1/PT2 = 12, CE = 8', () => {
    expect(hoursForCode('medico', 'X')).toBe(24)
    expect(hoursForCode('medico', 'PT1')).toBe(12)
    expect(hoursForCode('medico', 'PT2')).toBe(12)
    expect(hoursForCode('medico', 'CE')).toBe(8)
    expect(hoursForCode('medico', 'HD')).toBe(10)
  })

  it('todas las claves tienen color y horas definidas', () => {
    for (const s of SHIFTS_ENFERMERIA) {
      expect(s.code.length).toBeGreaterThan(0)
      expect(s.color).toMatch(/^#/)
      expect(s.hours).toBeGreaterThanOrEqual(0)
      expect(shiftMeta('enfermeria', s.code)?.code).toBe(s.code)
    }
    for (const s of SHIFTS_MEDICO) {
      expect(shiftMeta('medico', s.code)?.code).toBe(s.code)
      expect(s.hours).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('totales de horario', () => {
  it('plannedHours suma horas de celdas', () => {
    const doc = createBlankSchedule('enfermeria', 2026, 7, { withDemo: false })
    const staffId = 'enf-1'
    doc.staff = [
      {
        id: staffId,
        name: 'Test',
        fun: 'ENF',
        role: 'Enfermera',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'D1',
        order: 1,
      },
    ]
    doc.cells = {
      [cellKey(staffId, 1)]: 'D1',
      [cellKey(staffId, 2)]: 'N1',
      [cellKey(staffId, 3)]: 'L',
      [cellKey(staffId, 4)]: 'A2',
    }
    expect(plannedHours(doc, staffId)).toBe(12 + 12 + 0 + 8)
    expect(plannedShifts(doc, staffId)).toBe(3)
    expect(totalPaidHours(doc, { ...doc.staff[0], horasExtras: 4 })).toBe(
      32 + 4,
    )
  })
})

describe('cobertura y validaciones', () => {
  it('detecta cobertura baja', () => {
    const doc = createBlankSchedule('enfermeria', 2026, 7, { withDemo: false })
    doc.staff = [
      {
        id: 'a',
        name: 'A',
        fun: 'ENF',
        role: 'Enf',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'D1',
        order: 1,
      },
    ]
    doc.coverageRule = { minStaffPerDay: 2, minHoursPerDay: 16 }
    doc.cells = { [cellKey('a', 1)]: 'D1' }
    const cov = coverageByDay(doc)
    expect(cov[0].count).toBe(1)
    expect(cov[0].hours).toBe(12)
    const alerts = validateCoverage(doc)
    expect(alerts.some((a) => a.code === 'cobertura_baja' && a.day === 1)).toBe(
      true,
    )
  })

  it('detecta racha sin descanso', () => {
    const doc = createBlankSchedule('enfermeria', 2026, 7, { withDemo: false })
    doc.staff = [
      {
        id: 'a',
        name: 'Ana',
        fun: 'ENF',
        role: 'Enf',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'D1',
        order: 1,
      },
    ]
    const cells: Record<string, string> = {}
    for (let d = 1; d <= 8; d++) cells[cellKey('a', d)] = 'D1'
    doc.cells = cells
    const alerts = validateRestDays(doc, 6)
    expect(alerts.some((a) => a.code === 'sin_descanso')).toBe(true)
  })

  it('post-guardia médica alerta turno productivo al día siguiente', () => {
    const doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    doc.staff = [
      {
        id: 'm',
        name: 'Dr. X',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'X',
        order: 1,
      },
    ]
    doc.cells = {
      [cellKey('m', 1)]: 'X',
      [cellKey('m', 2)]: 'CE',
    }
    const alerts = validatePostGuard(doc)
    expect(alerts.some((a) => a.code === 'post_guardia')).toBe(true)
  })

  it('bloquea edición si APROBADO salvo admin', () => {
    expect(canEditSchedule('APROBADO', 'lider_servicio')).toBe(false)
    expect(canEditSchedule('APROBADO', 'admin')).toBe(true)
    expect(canEditSchedule('BORRADOR', 'lider_servicio')).toBe(true)
  })
})

describe('operaciones de mes', () => {
  it('llena fines de semana vacíos con L', async () => {
    const { fillEmptyWeekendsWithLibre } = await import('./scheduleOps')
    const doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    doc.staff = [
      {
        id: 'm1',
        name: 'Dra. Test',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'CE',
        order: 1,
      },
    ]
    const next = fillEmptyWeekendsWithLibre(doc)
    // 4 y 5 de julio 2026 son sábado y domingo
    expect(next.cells[cellKey('m1', 4)]).toBe('L')
    expect(next.cells[cellKey('m1', 5)]).toBe('L')
    expect(next.cells[cellKey('m1', 6)]).toBeUndefined()
  })

  it('no pisa celdas existentes al llenar fines de semana', async () => {
    const { fillEmptyWeekendsWithLibre } = await import('./scheduleOps')
    const doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    doc.staff = [
      {
        id: 'm1',
        name: 'Dra. Test',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'CE',
        order: 1,
      },
    ]
    doc.cells = { [cellKey('m1', 4)]: 'X' }
    const next = fillEmptyWeekendsWithLibre(doc)
    expect(next.cells[cellKey('m1', 4)]).toBe('X')
    expect(next.cells[cellKey('m1', 5)]).toBe('L')
  })
})

describe('feriados Ecuador', () => {
  it('incluye Año Nuevo y Navidad', () => {
    const list = ecuadorHolidays(2026)
    expect(list.some((h) => h.date === '2026-01-01')).toBe(true)
    expect(list.some((h) => h.date === '2026-12-25')).toBe(true)
    expect(list.some((h) => h.name === 'Viernes Santo')).toBe(true)
  })
})
