import { beforeEach, describe, expect, it } from 'vitest'
import { createBlankSchedule } from '../data/demo'
import { cellKey } from './calendar'
import { paintDayColumn } from './scheduleOps'

describe('distribución médica (areaCells)', () => {
  beforeEach(() => {
    // noop
  })

  it('crea horario médico con areaCells independiente de cells', () => {
    const doc = createBlankSchedule('medico', 2026, 7, { withDemo: true })
    expect(doc.areaCells).toBeTruthy()
    expect(Object.keys(doc.cells).length).toBeGreaterThan(0)
    expect(Object.keys(doc.areaCells ?? {}).length).toBeGreaterThan(0)
    // Turnos no deben mezclar códigos de área productivos antiguos
    const turnoCodes = new Set(Object.values(doc.cells))
    expect(turnoCodes.has('CE') || turnoCodes.has('PT1')).toBe(true)
  })

  it('pintar columna en areaCells no altera cells de turnos', () => {
    let doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    doc.staff = [
      {
        id: 'm1',
        name: 'Dr. Test',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'CE',
        order: 1,
      },
    ]
    doc.cells = { [cellKey('m1', 1)]: 'CE' }
    doc.areaCells = {}
    const beforeTurno = { ...doc.cells }
    doc = paintDayColumn(doc, 2, 'E', 'areaCells')
    expect(doc.cells).toEqual(beforeTurno)
    expect(doc.areaCells?.[cellKey('m1', 2)]).toBe('E')
  })
})
