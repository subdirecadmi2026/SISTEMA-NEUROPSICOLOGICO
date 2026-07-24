import { beforeEach, describe, expect, it } from 'vitest'
import { createBlankSchedule } from '../data/demo'
import { createEmptyStaff } from './staffLibrary'
import {
  authorityCount,
  AUTHORITY_KIND_LABEL,
  addAuthority,
  buildAdmisionesSignatureBox,
  buildPrintSignatureBoxes,
  createOrUpdateUserFromSigner,
  fullSignerName,
  getSignersConfig,
  listActiveSigners,
  removeAuthority,
  resetSignersToDefaults,
  setSignersCount,
  updateSigner,
} from './signersStore'

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

describe('autoridades de firma', () => {
  beforeEach(() => {
    installMemoryStorage()
    resetSignersToDefaults()
  })

  it('la 1.ª firma es el jefe automático; admin solo configura autoridades', () => {
    expect(getSignersConfig().count).toBe(3)
    expect(authorityCount()).toBe(2)
    expect(listActiveSigners()).toHaveLength(2)
    expect(
      listActiveSigners().every((s) => s.kind !== ('elaborado' as never)),
    ).toBe(true)

    expect(setSignersCount(5).signers).toHaveLength(4)
    expect(authorityCount(setSignersCount(4))).toBe(3)
  })

  it('impresión antepone al jefe con datos del horario', () => {
    const doc = createBlankSchedule('medico', 2026, 7, {
      withDemo: false,
      unitName: 'Medicina interna',
      staff: [
        {
          ...createEmptyStaff('medico', 'Medicina interna'),
          name: 'Dr. Pérez',
        },
      ],
    })
    doc.jefeServicio = 'Dra. Ana López'
    const boxes = buildPrintSignatureBoxes(doc)
    expect(boxes[0].kind).toBe('elaborado')
    expect(boxes[0].label).toMatch(/Jefe de servicio/i)
    expect(boxes[0].designatedName).toBe('Dra. Ana López')
    expect(boxes.every((b) => b.kind !== 'admisiones')).toBe(true)
    expect(boxes.length).toBe(1 + listActiveSigners().length)
    const adm = buildAdmisionesSignatureBox(doc)
    expect(adm.kind).toBe('admisiones')
    expect(adm.label).toMatch(/Validado por Admisiones/i)
    // Nunca el jefe médico: usa encargado de Admisiones (o quien firmó)
    expect(adm.designatedName).not.toBe('Dra. Ana López')
    expect(adm.designatedName).toBe('Lic. Carmen Ortiz')
  })

  it('caja Admisiones usa quien firmó, no el jefe de servicio', () => {
    const doc = createBlankSchedule('medico', 2026, 8, {
      withDemo: false,
      unitName: 'Nefrología',
      staff: [],
    })
    doc.jefeServicio = 'ANDRES MAYORGA'
    doc.admisionesPor = 'Lic. Carmen Ortiz — Admisiones'
    doc.admisionesApprovedAt = new Date().toISOString()
    const adm = buildAdmisionesSignatureBox(doc)
    expect(adm.designatedName).toBe('Lic. Carmen Ortiz')
    expect(adm.value).toContain('Carmen Ortiz')
    expect(adm.designatedName).not.toBe(doc.jefeServicio)
  })

  it('crea usuario de autoridad con nombres y responsabilidad', () => {
    const id = getSignersConfig().signers[0].id
    updateSigner(id, {
      nombres: 'Patricia',
      apellidos: 'Vega Ruiz',
      cargo: 'Talento Humano',
      email: 'patricia.vega.firmas@hgp.gob.ec',
      kind: 'talento_humano',
    })
    const s = listActiveSigners().find((x) => x.id === id)!
    expect(fullSignerName(s)).toBe('Patricia Vega Ruiz')
    expect(s.kind).toBe('talento_humano')
    expect(AUTHORITY_KIND_LABEL[s.kind]).toBe('Talento Humano')
    const { userId, signer } = createOrUpdateUserFromSigner(id, 'hgp2026')
    expect(userId).toBeTruthy()
    expect(signer.linkedUserId).toBe(userId)
  })

  it('ofrece Dirección Asistencial, Dirección Médica, Gerencia y Talento Humano', () => {
    const kinds = setSignersCount(5).signers.map((s) => s.kind)
    expect(kinds).toEqual([
      'direccion_asistencial',
      'direccion_medica',
      'gerencia',
      'talento_humano',
    ])
  })

  it('permite crear y eliminar autoridades según se necesiten', () => {
    resetSignersToDefaults()
    expect(authorityCount()).toBe(2)

    const added = addAuthority('gerencia')
    expect(authorityCount(added)).toBe(3)
    expect(added.signers.at(-1)?.kind).toBe('gerencia')
    expect(added.count).toBe(4)

    const id = added.signers[0].id
    const afterDel = removeAuthority(id)
    expect(authorityCount(afterDel)).toBe(2)
    expect(afterDel.signers.find((s) => s.id === id)).toBeUndefined()
    expect(afterDel.count).toBe(3)

    // Puede dejar solo el jefe
    let cfg = getSignersConfig()
    for (const s of [...cfg.signers]) {
      cfg = removeAuthority(s.id)
    }
    expect(authorityCount(cfg)).toBe(0)
    expect(cfg.count).toBe(1)
    expect(buildPrintSignatureBoxes(
      createBlankSchedule('medico', 2026, 7, {
        withDemo: false,
        unitName: 'UCI',
        staff: [],
      }),
    )).toHaveLength(1)
  })

  it('permite espacios al escribir nombres y apellidos', () => {
    const id = getSignersConfig().signers[0].id
    updateSigner(id, { nombres: 'María ' })
    expect(getSignersConfig().signers.find((s) => s.id === id)?.nombres).toBe(
      'María ',
    )
    updateSigner(id, { nombres: 'María Fernanda', apellidos: 'Pérez ' })
    const s = getSignersConfig().signers.find((x) => x.id === id)!
    expect(s.nombres).toBe('María Fernanda')
    expect(s.apellidos).toBe('Pérez ')
    expect(fullSignerName({ ...s, apellidos: 'Pérez Guatatuca' })).toBe(
      'María Fernanda Pérez Guatatuca',
    )
  })
})
