import { beforeEach, describe, expect, it } from 'vitest'
import { createBlankSchedule } from '../data/demo'
import { createEmptyStaff } from './staffLibrary'
import {
  authorityCount,
  buildPrintSignatureBoxes,
  createOrUpdateUserFromSigner,
  fullSignerName,
  getSignersConfig,
  listActiveSigners,
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
    expect(listActiveSigners().every((s) => s.kind !== 'elaborado' as never)).toBe(
      true,
    )

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
    expect(boxes.length).toBe(1 + listActiveSigners().length)
  })

  it('crea usuario de autoridad con nombres y responsabilidad', () => {
    const id = getSignersConfig().signers[0].id
    updateSigner(id, {
      nombres: 'Patricia',
      apellidos: 'Vega Ruiz',
      cargo: 'Talento Humano',
      email: 'patricia.vega.firmas@hgp.gob.ec',
      kind: 'validado',
    })
    const s = listActiveSigners().find((x) => x.id === id)!
    expect(fullSignerName(s)).toBe('Patricia Vega Ruiz')
    const { userId, signer } = createOrUpdateUserFromSigner(id, 'hgp2026')
    expect(userId).toBeTruthy()
    expect(signer.linkedUserId).toBe(userId)
  })
})
