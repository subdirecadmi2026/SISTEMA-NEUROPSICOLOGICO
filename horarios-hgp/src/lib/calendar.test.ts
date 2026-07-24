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
  assignmentsOnDay,
  staffHoursRanking,
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
  it('detecta cobertura baja solo si el día ya tiene actividad', () => {
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
    expect(alerts.every((a) => a.level === 'warning')).toBe(true)
    // Días vacíos no generan alerta (rotativos / 24 h)
    expect(alerts.some((a) => a.day === 2)).toBe(false)
  })

  it('permite enviar a revisión con mes parcial (rotativos)', async () => {
    const { getSubmissionChecklist, isReadyToSubmit, validateCoverage } =
      await import('./validation')
    const doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    doc.staff = [
      {
        id: 'a',
        name: 'Dr. Rotativo',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'X',
        order: 1,
      },
    ]
    doc.jefeServicio = 'Dr. Jefe'
    doc.cells = { [cellKey('a', 1)]: 'X', [cellKey('a', 3)]: 'CE' }
    doc.coverageRule = { minStaffPerDay: 2, minHoursPerDay: 16 }
    // Cobertura baja solo como aviso, no bloquea
    expect(validateCoverage(doc).every((a) => a.level === 'warning')).toBe(true)
    expect(isReadyToSubmit(doc)).toBe(true)
    expect(getSubmissionChecklist(doc).find((i) => i.id === 'errores')).toBe(
      undefined,
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

  it('revisor y validador solo visualizan (no editan celdas)', () => {
    expect(canEditSchedule('BORRADOR', 'revisor')).toBe(false)
    expect(canEditSchedule('EN_REVISION', 'revisor')).toBe(false)
    expect(canEditSchedule('APROBADO', 'validador')).toBe(false)
    expect(canEditSchedule('BORRADOR', null)).toBe(false)
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

  it('no pisa ausencias al llenar fines de semana; sí reemplaza turnos productivos', async () => {
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
    doc.cells = {
      [cellKey('m1', 4)]: 'V',
      [cellKey('m1', 5)]: 'CE',
    }
    const next = fillEmptyWeekendsWithLibre(doc)
    expect(next.cells[cellKey('m1', 4)]).toBe('V')
    expect(next.cells[cellKey('m1', 5)]).toBe('L')
  })

  it('copia patrón de la primera semana a celdas vacías', async () => {
    const { copyFirstWeekPattern } = await import('./scheduleOps')
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
    doc.cells = {
      [cellKey('m1', 1)]: 'CE',
      [cellKey('m1', 2)]: 'L',
      [cellKey('m1', 3)]: 'X',
    }
    const next = copyFirstWeekPattern(doc)
    // día 8 = patrón día 1, día 9 = día 2, día 10 = día 3
    expect(next.cells[cellKey('m1', 8)]).toBe('CE')
    expect(next.cells[cellKey('m1', 9)]).toBe('L')
    expect(next.cells[cellKey('m1', 10)]).toBe('X')
  })

  it('pinta columna de un día', async () => {
    const { paintDayColumn } = await import('./scheduleOps')
    const doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    doc.staff = [
      {
        id: 'a',
        name: 'A',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'CE',
        order: 1,
      },
      {
        id: 'b',
        name: 'B',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'CE',
        order: 2,
      },
    ]
    const next = paintDayColumn(doc, 3, 'CE')
    expect(next.cells[cellKey('a', 3)]).toBe('CE')
    expect(next.cells[cellKey('b', 3)]).toBe('CE')
  })

  it('reordena y duplica personal', async () => {
    const { moveStaffOrder, duplicateStaffRow } = await import('./scheduleOps')
    const doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    doc.staff = [
      {
        id: 'a',
        name: 'Ana',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'CE',
        order: 1,
      },
      {
        id: 'b',
        name: 'Bruno',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'CE',
        order: 2,
      },
    ]
    const moved = moveStaffOrder(doc, 'b', -1)
    expect(moved.staff[0].id).toBe('b')
    const dup = duplicateStaffRow(doc, 'a')
    expect(dup.staff.length).toBe(3)
    expect(dup.staff.some((s) => s.name.includes('(copia)'))).toBe(true)
  })

  it('sugiere contingencia desde ausencias', async () => {
    const { suggestContingencyFromAbsences } = await import('./scheduleOps')
    const doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    doc.staff = [
      {
        id: 'a',
        name: 'Dr. Ausente',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'CE',
        order: 1,
      },
    ]
    doc.cells = { [cellKey('a', 2)]: 'V' }
    const next = suggestContingencyFromAbsences(doc)
    expect(next.contingencyStaff.some((c) => c.name === 'Dr. Ausente')).toBe(
      true,
    )
  })

  it('aplica L tras guardia en celdas vacías', async () => {
    const { applyPostGuardLibre } = await import('./scheduleOps')
    const doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    doc.staff = [
      {
        id: 'a',
        name: 'Dr. Guardia',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'X',
        order: 1,
      },
    ]
    doc.cells = { [cellKey('a', 1)]: 'X' }
    const next = applyPostGuardLibre(doc)
    expect(next.cells[cellKey('a', 2)]).toBe('L')
  })

  it('crea borrador del mes siguiente con mismo personal', async () => {
    const { createNextMonthDraft } = await import('./scheduleOps')
    const doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    doc.staff = [
      {
        id: 'a',
        name: 'Dra. Test',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'CE',
        order: 1,
      },
    ]
    doc.cells = { [cellKey('a', 1)]: 'CE' }
    const next = createNextMonthDraft(doc)
    expect(next.month).toBe(8)
    expect(next.year).toBe(2026)
    expect(next.staff[0].name).toBe('Dra. Test')
    expect(Object.keys(next.cells)).toHaveLength(0)
    expect(next.status).toBe('BORRADOR')
    expect(next.id).not.toBe(doc.id)
    expect(next.elaboradoPor).toBe('')
    expect(next.electronicSigns ?? []).toHaveLength(0)
  })

  it('pega nombres y copia turnos entre personas', async () => {
    const { addStaffFromNameList, copyCellsBetweenStaff, sortStaffByName } =
      await import('./scheduleOps')
    let doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    doc.staff = []
    doc = addStaffFromNameList(doc, 'Dr. Uno\nDra. Dos\nDr. Uno')
    expect(doc.staff).toHaveLength(2)
    doc.cells = { [cellKey(doc.staff[0].id, 1)]: 'CE' }
    const copied = copyCellsBetweenStaff(doc, doc.staff[0].id, doc.staff[1].id)
    expect(copied.cells[cellKey(doc.staff[1].id, 1)]).toBe('CE')
    const sorted = sortStaffByName(copied)
    expect(sorted.staff[0].name.startsWith('Dr')).toBe(true)
  })

  it('aplica código habitual y reporta vacíos', async () => {
    const { applyHabitualCodesToEmpty, emptyCellsReport, swapCodesInSchedule } =
      await import('./scheduleOps')
    const doc = createBlankSchedule('enfermeria', 2026, 7, { withDemo: false })
    doc.staff = [
      {
        id: 'a',
        name: 'Lic. Ana',
        fun: 'ENF',
        role: 'Enf',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'D1',
        order: 1,
      },
    ]
    expect(emptyCellsReport(doc)[0]?.emptyDays).toBe(31)
    const filledWeekdays = applyHabitualCodesToEmpty(doc)
    expect(filledWeekdays.cells[cellKey('a', 1)]).toBe('D1')
    // 4 y 5 jul 2026 = sáb/dom → siguen vacíos con weekdaysOnly
    expect(filledWeekdays.cells[cellKey('a', 4)]).toBeUndefined()
    const filledAll = applyHabitualCodesToEmpty(doc, { weekdaysOnly: false })
    expect(emptyCellsReport(filledAll)).toHaveLength(0)
    const swapped = swapCodesInSchedule(filledAll, 'D1', 'N1')
    expect(swapped.cells[cellKey('a', 1)]).toBe('N1')
  })

  it('checklist de envío exige nombre, jefe y celdas', async () => {
    const { getSubmissionChecklist, isReadyToSubmit } = await import(
      './validation'
    )
    const doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    expect(isReadyToSubmit(doc)).toBe(false)
    doc.staff = [
      {
        id: 'a',
        name: 'Ana',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'CE',
        order: 1,
      },
    ]
    doc.jefeServicio = 'Dr. Jefe'
    doc.cells = { [cellKey('a', 1)]: 'CE' }
    doc.coverageRule = { minStaffPerDay: 0, minHoursPerDay: 0 }
    const items = getSubmissionChecklist(doc)
    expect(items.find((i) => i.id === 'nombres')?.ok).toBe(true)
    expect(items.find((i) => i.id === 'jefe')?.ok).toBe(true)
    expect(isReadyToSubmit(doc)).toBe(true)
  })

  it('reemplaza clave y duplica horario como nuevo', async () => {
    const { replaceCodeInSchedule, duplicateScheduleAsNew } =
      await import('./scheduleOps')
    const doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    doc.staff = [
      {
        id: 'a',
        name: 'Ana',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'CE',
        order: 1,
      },
    ]
    doc.cells = { [cellKey('a', 1)]: 'CE', [cellKey('a', 2)]: 'CE' }
    const replaced = replaceCodeInSchedule(doc, 'CE', 'HA')
    expect(replaced.cells[cellKey('a', 1)]).toBe('HA')
    expect(replaced.cells[cellKey('a', 2)]).toBe('HA')
    const copy = duplicateScheduleAsNew(replaced)
    expect(copy.id).not.toBe(doc.id)
    expect(copy.status).toBe('BORRADOR')
    expect(copy.staff[0].name).toBe('Ana')
    expect(Object.values(copy.cells)).toContain('HA')
    expect(copy.elaboradoPor).toBe('')
    expect(copy.talentoHumano).toBe('')
    expect(copy.electronicSigns ?? []).toHaveLength(0)
  })
})

describe('export CSV', () => {
  it('genera CSV con BOM y totales', async () => {
    const { buildScheduleCsv } = await import('./exportCsv')
    const doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    doc.staff = [
      {
        id: 'a',
        name: 'Ana',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'CE',
        order: 1,
      },
    ]
    doc.cells = { [cellKey('a', 1)]: 'CE' }
    const csv = buildScheduleCsv(doc)
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('Ana')
    expect(csv).toContain('CE')
    expect(csv).toContain('TOTAL HORAS DÍA')
  })
})

describe('comparar mes anterior', () => {
  it('detecta diferencia de horas cuando hay mes previo en storage', async () => {
    const store: Record<string, string> = {}
    const ls = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
    }
    Object.defineProperty(globalThis, 'localStorage', {
      value: ls,
      configurable: true,
    })

    const { saveSchedule, deleteSchedule } = await import('./storage')
    const { compareWithPreviousMonth } = await import('./monthCompare')

    const prev = createBlankSchedule('medico', 2026, 6, { withDemo: false })
    prev.unitName = 'Medicina interna'
    prev.staff = [
      {
        id: 'p1',
        name: 'Dra. Test',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'CE',
        order: 1,
      },
    ]
    prev.cells = { [cellKey('p1', 1)]: 'CE', [cellKey('p1', 2)]: 'CE' }
    const savedPrev = saveSchedule(prev)

    const curr = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    curr.unitName = 'Medicina interna'
    curr.staff = [
      {
        id: 'c1',
        name: 'Dra. Test',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'CE',
        order: 1,
      },
    ]
    curr.cells = { [cellKey('c1', 1)]: 'CE' }

    const cmp = await compareWithPreviousMonth(curr)
    expect(cmp).not.toBeNull()
    expect(cmp!.prevLabel).toBe('6/2026')
    const row = cmp!.rows.find((r) => r.name === 'Dra. Test')
    expect(row?.hoursPrev).toBe(16)
    expect(row?.hoursNow).toBe(8)
    expect(row?.delta).toBe(-8)

    deleteSchedule(savedPrev.id)
  })
})

describe('asignaciones y ranking', () => {
  it('lista quién trabaja un día y ranking de horas', () => {
    const doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    doc.staff = [
      {
        id: 'a',
        name: 'Ana',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'CE',
        order: 1,
      },
      {
        id: 'b',
        name: 'Bruno',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'X',
        order: 2,
      },
    ]
    doc.cells = {
      [cellKey('a', 1)]: 'CE',
      [cellKey('b', 1)]: 'X',
      [cellKey('b', 2)]: 'X',
    }
    const day1 = assignmentsOnDay(doc, 1)
    expect(day1).toHaveLength(2)
    const rank = staffHoursRanking(doc)
    expect(rank[0].name).toBe('Bruno')
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

describe('flujo de roles Jefe → Admisiones + Revisor → Validador', () => {
  it('jefe envía, admisiones y revisor aprueban, validador valida', async () => {
    const { transitionStatus } = await import('./auth')
    const { DEMO_USERS } = await import('./auth')
    const jefe = DEMO_USERS.find((u) => u.id === 'u-jefe')!
    const admisiones = DEMO_USERS.find((u) => u.id === 'u-admisiones')!
    const revisor = DEMO_USERS.find((u) => u.id === 'u-revisor')!
    const validador = DEMO_USERS.find((u) => u.id === 'u-validador')!

    let doc = createBlankSchedule('medico', 2026, 8, { withDemo: false })
    doc.staff = [
      {
        id: 'm1',
        name: 'Dr. Demo',
        fun: 'MED',
        role: 'Médico',
        relacionLaboral: 'LOSEP',
        codigoPersonal: 'CE',
        order: 1,
      },
    ]

    // Validador no puede enviar
    const badSend = transitionStatus(doc, 'EN_REVISION', validador)
    expect(badSend.ok).toBe(false)

    const sent = transitionStatus(doc, 'EN_REVISION', jefe)
    expect(sent.ok).toBe(true)
    if (!sent.ok) return
    doc = sent.doc
    expect(doc.status).toBe('EN_REVISION')

    // Devolver sin comentario falla
    const badReturn = transitionStatus(doc, 'BORRADOR', revisor)
    expect(badReturn.ok).toBe(false)

    const returned = transitionStatus(doc, 'BORRADOR', revisor, {
      comment: 'Falta cobertura el día 15',
    })
    expect(returned.ok).toBe(true)
    if (!returned.ok) return
    doc = returned.doc
    expect(doc.status).toBe('BORRADOR')
    expect(doc.reviewComments.some((c) => c.message.includes('día 15'))).toBe(
      true,
    )

    const resent = transitionStatus(doc, 'EN_REVISION', jefe)
    expect(resent.ok).toBe(true)
    if (!resent.ok) return
    doc = resent.doc
    expect(doc.reviewComments.every((c) => c.resolved)).toBe(true)

    // Solo revisor → sigue en revisión
    const onlyRev = transitionStatus(doc, 'APROBADO', revisor, {
      approvalAs: 'revisor',
    })
    expect(onlyRev.ok).toBe(true)
    if (!onlyRev.ok) return
    doc = onlyRev.doc
    expect(doc.status).toBe('EN_REVISION')
    expect(doc.revisadoPor).toBeTruthy()

    // Admisiones completa → APROBADO
    const approved = transitionStatus(doc, 'APROBADO', admisiones, {
      approvalAs: 'admisiones',
      signedName: 'Lic. Carmen Ortiz',
    })
    expect(approved.ok).toBe(true)
    if (!approved.ok) return
    doc = approved.doc
    expect(doc.status).toBe('APROBADO')
    expect(doc.admisionesPor).toContain('Carmen Ortiz')

    // Jefe no valida
    const badVal = transitionStatus(doc, 'ARCHIVADO', jefe)
    expect(badVal.ok).toBe(false)

    const validated = transitionStatus(doc, 'ARCHIVADO', validador, {
      signedName: 'Ing. Patricia Vega Firmada',
    })
    expect(validated.ok).toBe(true)
    if (!validated.ok) return
    expect(validated.doc.status).toBe('ARCHIVADO')
    expect(validated.doc.talentoHumano).toContain('Patricia Vega Firmada')
  })

  it('guarda firmas con nombre firmado en cada etapa', async () => {
    const { transitionStatus, DEMO_USERS } = await import('./auth')
    const jefe = DEMO_USERS.find((u) => u.id === 'u-jefe')!
    const admisiones = DEMO_USERS.find((u) => u.id === 'u-admisiones')!
    const revisor = DEMO_USERS.find((u) => u.id === 'u-revisor')!
    const validador = DEMO_USERS.find((u) => u.id === 'u-validador')!

    let doc = createBlankSchedule('medico', 2026, 9, { withDemo: false })
    const sent = transitionStatus(doc, 'EN_REVISION', jefe, {
      signedName: 'Dr. Carlos Mendoza',
    })
    expect(sent.ok).toBe(true)
    if (!sent.ok) return
    doc = sent.doc
    expect(doc.elaboradoPor).toContain('Carlos Mendoza')

    const adm = transitionStatus(doc, 'APROBADO', admisiones, {
      approvalAs: 'admisiones',
      signedName: 'Lic. Carmen Ortiz',
    })
    expect(adm.ok).toBe(true)
    if (!adm.ok) return
    doc = adm.doc
    expect(doc.status).toBe('EN_REVISION')
    expect(doc.admisionesPor).toContain('Carmen Ortiz')

    const approved = transitionStatus(doc, 'APROBADO', revisor, {
      approvalAs: 'revisor',
      signedName: 'Dra. María Solís',
    })
    expect(approved.ok).toBe(true)
    if (!approved.ok) return
    doc = approved.doc
    expect(doc.status).toBe('APROBADO')
    expect(doc.revisadoPor).toContain('María Solís')

    const validated = transitionStatus(doc, 'ARCHIVADO', validador, {
      signedName: 'Ing. Patricia Vega',
    })
    expect(validated.ok).toBe(true)
    if (!validated.ok) return
    expect(validated.doc.talentoHumano).toContain('Patricia Vega')
  })
})

describe('notificación al jefe al validar', () => {
  it('crea aviso para lider_servicio', async () => {
    const {
      notifyJefeScheduleValidated,
      notifyJefeScheduleReturned,
      listNotificationsFor,
    } = await import('./notifications')
    const { DEMO_USERS } = await import('./auth')
    const jefe = DEMO_USERS.find((u) => u.id === 'u-jefe')!
    const doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    doc.unitName = 'Medicina interna'
    notifyJefeScheduleValidated(doc, 'Ing. Patricia Vega')
    const list = listNotificationsFor(jefe)
    expect(list.some((n) => n.title === 'Horario validado')).toBe(true)
    expect(list.some((n) => n.body.includes('Medicina interna'))).toBe(true)
    expect(list.some((n) => !n.read)).toBe(true)

    doc.unitName = 'Pediatría'
    notifyJefeScheduleReturned(doc, 'Dra. María Solís', 'Falta cobertura día 10')
    const list2 = listNotificationsFor(jefe)
    expect(list2.some((n) => n.title === 'Corrección solicitada')).toBe(true)
    expect(list2.some((n) => n.body.includes('Pediatría'))).toBe(true)
  })
})

describe('FirmaEC PKCS#12 local', () => {
  it('parsea certificado .p12 y formatea estampa', async () => {
    const forge = (await import('node-forge')).default
    const {
      parsePkcs12,
      formatElectronicStamp,
      slotForStatus,
    } = await import('./firmaEc')

    const keys = forge.pki.rsa.generateKeyPair(1024)
    const cert = forge.pki.createCertificate()
    cert.publicKey = keys.publicKey
    cert.serialNumber = '01'
    cert.validity.notBefore = new Date()
    cert.validity.notAfter = new Date()
    cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1)
    const attrs = [
      { name: 'commonName', value: 'Dra. María Solís' },
      { name: 'emailAddress', value: 'revisor@hgp.gob.ec' },
    ]
    cert.setSubject(attrs)
    cert.setIssuer(attrs)
    cert.sign(keys.privateKey, forge.md.sha256.create())

    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
      keys.privateKey,
      [cert],
      'clave123',
      { algorithm: '3des' },
    )
    const der = forge.asn1.toDer(p12Asn1).getBytes()
    const bytes = new Uint8Array(der.length)
    for (let i = 0; i < der.length; i++) bytes[i] = der.charCodeAt(i)

    const parsed = parsePkcs12(bytes, 'clave123')
    expect(parsed.subjectCn).toContain('María Solís')
    expect(slotForStatus('APROBADO')).toBe('revisor')

    const stamp = formatElectronicStamp({
      signedName: parsed.subjectCn,
      slot: 'revisor',
      subjectCn: parsed.subjectCn,
      signedAt: '2026-07-23T12:00:00.000Z',
      method: 'pkcs12_local',
    })
    expect(stamp).toContain('Firmado electrónicamente')
    expect(stamp).toContain('María Solís')
  })

  it('transitionStatus estampa firma electrónica en casilla del validador', async () => {
    const { transitionStatus, DEMO_USERS } = await import('./auth')
    const validador = DEMO_USERS.find((u) => u.id === 'u-validador')!
    const admisiones = DEMO_USERS.find((u) => u.id === 'u-admisiones')!
    const revisor = DEMO_USERS.find((u) => u.id === 'u-revisor')!
    const jefe = DEMO_USERS.find((u) => u.id === 'u-jefe')!

    const sent = transitionStatus(
      createBlankSchedule('medico', 2026, 10, { withDemo: false }),
      'EN_REVISION',
      jefe,
    )
    expect(sent.ok).toBe(true)
    if (!sent.ok) return
    let doc = sent.doc

    const adm = transitionStatus(doc, 'APROBADO', admisiones, {
      approvalAs: 'admisiones',
    })
    expect(adm.ok).toBe(true)
    if (!adm.ok) return
    doc = adm.doc

    const ap = transitionStatus(doc, 'APROBADO', revisor, {
      approvalAs: 'revisor',
    })
    expect(ap.ok).toBe(true)
    if (!ap.ok) return
    doc = ap.doc
    expect(doc.status).toBe('APROBADO')

    const validated = transitionStatus(doc, 'ARCHIVADO', validador, {
      electronic: {
        slot: 'validador',
        subjectCn: 'Ing. Patricia Vega',
        signedAt: new Date().toISOString(),
        method: 'pkcs12_local',
        stampText:
          'Ing. Patricia Vega\nFirmado electrónicamente · FirmaEC\n23/7/2026',
      },
    })
    expect(validated.ok).toBe(true)
    if (!validated.ok) return
    expect(validated.doc.talentoHumano).toContain('Firmado electrónicamente')
    expect(
      validated.doc.electronicSigns?.some((e) => e.slot === 'validador'),
    ).toBe(true)
  })
})

describe('bandeja por rol', () => {
  it('cuenta pendientes de revisor y validador', async () => {
    const { countPendingForRole } = await import('../components/RoleInbox')
    const items = [
      {
        id: '1',
        label: 'a',
        serviceType: 'medico' as const,
        unitName: 'Medicina interna',
        month: 7,
        year: 2026,
        updatedAt: '2026-07-01',
        status: 'EN_REVISION' as const,
      },
      {
        id: '2',
        label: 'b',
        serviceType: 'medico' as const,
        unitName: 'Pediatría',
        month: 7,
        year: 2026,
        updatedAt: '2026-07-02',
        status: 'APROBADO' as const,
      },
      {
        id: '3',
        label: 'c',
        serviceType: 'medico' as const,
        unitName: 'Medicina interna',
        month: 8,
        year: 2026,
        updatedAt: '2026-07-03',
        status: 'BORRADOR' as const,
      },
    ]
    const revisor = {
      id: 'u-revisor',
      email: 'r@hgp.gob.ec',
      name: 'R',
      role: 'revisor' as const,
      serviceUnits: [] as string[],
    }
    const validador = { ...revisor, id: 'u-val', role: 'validador' as const }
    const jefe = { ...revisor, id: 'u-j', role: 'lider_servicio' as const }
    expect(countPendingForRole(revisor, items)).toBe(1)
    expect(countPendingForRole(validador, items)).toBe(1)
    expect(countPendingForRole(jefe, items)).toBe(1)
  })
})

describe('workspace por rol', () => {
  it('revisor y validador van a módulo de tarjetas; jefe a editor', async () => {
    const { workspaceModeFor } = await import('../components/ReviewCardsModule')
    expect(
      workspaceModeFor({
        id: '1',
        email: 'a',
        name: 'J',
        role: 'lider_servicio',
        serviceUnits: [],
      }),
    ).toBe('editor')
    expect(
      workspaceModeFor({
        id: 'admin',
        email: 'admin@hgp.gob.ec',
        name: 'A',
        role: 'admin',
        serviceUnits: [],
      }),
    ).toBe('admin')
    expect(
      workspaceModeFor({
        id: '2',
        email: 'b',
        name: 'R',
        role: 'revisor',
        serviceUnits: [],
      }),
    ).toBe('revisor')
    expect(
      workspaceModeFor({
        id: '3',
        email: 'c',
        name: 'V',
        role: 'validador',
        serviceUnits: [],
      }),
    ).toBe('validador')
    expect(workspaceModeFor(null)).toBe('login')
  })
})

describe('PDF archivo validador', () => {
  it('nombra carpeta y archivo por especialidad', async () => {
    const { specialtyFolderName, pdfFileName } = await import('./exportPdf')
    const doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    doc.unitName = 'Medicina interna'
    expect(specialtyFolderName(doc)).toBe('Medicina interna')
    expect(pdfFileName(doc)).toContain('Medicina interna')
    expect(pdfFileName(doc)).toContain('2026-07')
  })
})

describe('integridad de firmas en borradores', () => {
  it('horario nuevo sin demo no trae firmas falsas', () => {
    const doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    expect(doc.elaboradoPor).toBe('')
    expect(doc.revisadoPor).toBe('')
    expect(doc.aprobadoPor).toBe('')
    expect(doc.talentoHumano).toBe('')
    expect(doc.electronicSigns ?? []).toHaveLength(0)
  })

  it('admin al reabrir limpia firmas del horario cerrado', async () => {
    const { transitionStatus, DEMO_USERS } = await import('./auth')
    const admin = DEMO_USERS.find((u) => u.id === 'u-admin')!
    let doc = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    doc.status = 'ARCHIVADO'
    doc.elaboradoPor = 'Jefe'
    doc.revisadoPor = 'Revisor'
    doc.aprobadoPor = 'Revisor'
    doc.talentoHumano = 'Validador'
    doc.electronicSigns = [
      {
        slot: 'validador',
        subjectCn: 'Validador',
        signedAt: new Date().toISOString(),
        method: 'nombre_qr',
        stampText: 'Validador',
      },
    ]
    const result = transitionStatus(doc, 'BORRADOR', admin)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.doc.status).toBe('BORRADOR')
      expect(result.doc.elaboradoPor).toBe('')
      expect(result.doc.talentoHumano).toBe('')
      expect(result.doc.electronicSigns ?? []).toHaveLength(0)
    }
  })
})
